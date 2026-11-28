import { v5 as uuidForRequest } from "uuid";
import type { NutricionPerfil, NutricionReferencia } from "../generated/prisma/client.js";

type ProfileResult = {
  settings: Omit<NutricionPerfil, "usuarioId"> | null;
  weight: number | null;
  today: string;
  reference: (Omit<NutricionReferencia, "usuarioId"> & { currentEstimate: ReturnType<typeof proteinReference> }) | null;
  methodSource: string;
};
import type { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../errors/AppError.js";
import { compatible, contribution, findFood, mealIdeas, recommendations } from "./catalog.js";
import { foods, type Food } from "./foods.js";
import { localDay, methodSource, methodVersion, proteinReference, twoDecimals } from "./method.js";
import { nutritionDb as db } from "./repository.js";
import type { z } from "zod";
import type { catalogInput, entryInput, historyInput, profileInput } from "./validation.js";

const dayDate = (day: string) => new Date(day + "T00:00:00.000Z");
const dayKey = (day: Date) => day.toISOString().slice(0, 10);
const newest = [{ day: "desc" }, { createdAt: "desc" }, { id: "desc" }] as const;
const pageSize = 30;

function estimate(birthYear: number, day: string, weight: number, activity: string, needsProfessional: boolean) {
  const minimumAge = Number(day.slice(0, 4)) - birthYear - 1;
  if (minimumAge >= 64 || (process.env.NODE_ENV === "production" &&
      process.env.NUTRITION_METHOD_REVIEWED !== methodVersion)) return null;
  return proteinReference(minimumAge, weight, activity, needsProfessional);
}

export async function profile(usuarioId: string, refresh = true): Promise<ProfileResult> {
  const [settings, weight] = await Promise.all([
    db.profiles.findUnique({ where: { usuarioId }, omit: { usuarioId: true } }),
    db.latestWeight(usuarioId),
  ]);
  const today = localDay(settings?.zone ?? "America/Bogota");
  const reference = settings ? await db.references.findFirst({
    where: { usuarioId, day: { lte: dayDate(today) } }, orderBy: [...newest], omit: { usuarioId: true },
  }) : null;
  const currentWeight = weight?.pesoActualKg ?? null;
  const currentEstimate = settings && currentWeight !== null
    ? estimate(settings.birthYear, today, currentWeight, settings.activity, settings.needsProfessional)
    : null;
  if (refresh && settings && reference && currentWeight !== null &&
      (reference.weight !== currentWeight || reference.method !== methodVersion ||
      reference.minimum !== (currentEstimate?.minimum ?? null) || reference.maximum !== (currentEstimate?.maximum ?? null))) {
    await db.transaction(usuarioId, async (tx) => {
      const stored = await tx.nutricionPerfil.findUnique({ where: { usuarioId } });
      const current = await db.latestWeight(usuarioId, tx);
      if (stored && current?.pesoActualKg != null) {
        await saveReference(tx, usuarioId, stored, current.pesoActualKg, localDay(stored.zone));
      }
    });
    return profile(usuarioId, false);
  }
  return { settings, weight: currentWeight, today, reference: reference && { ...reference, currentEstimate }, methodSource };
}

async function saveReference(tx: Prisma.TransactionClient, usuarioId: string,
  settings: Pick<NutricionPerfil, "birthYear" | "activity" | "goal" | "needsProfessional">, weight: number, today: string) {
  const day = dayDate(today);
  const fixed = await tx.nutricionReferencia.findFirst({
    where: { usuarioId, day: { lte: day } }, orderBy: [...newest],
  });
  const range = estimate(settings.birthYear, today, weight, settings.activity, settings.needsProfessional);
  const next = {
    goal: settings.goal, weight, minimum: range?.minimum ?? null,
    maximum: range?.maximum ?? null, method: methodVersion,
  };
  if (!fixed || Object.entries(next).some(([key, value]) => fixed[key as keyof typeof next] !== value)) {
    await tx.nutricionReferencia.create({ data: { ...next, usuarioId, day } });
  }
}

export async function saveProfile(usuarioId: string, input: z.infer<typeof profileInput>) {
  const { weight: supplied, ...settings } = input;
  const now = new Date();
  const today = localDay(settings.zone, now);
  if (settings.birthYear > Number(today.slice(0, 4))) throw new AppError(400, "Revisa el año de nacimiento.");
  await db.transaction(usuarioId, async (tx) => {
    const previous = await db.latestWeight(usuarioId, tx);
    const weight = supplied ?? previous?.pesoActualKg ?? null;
    if (weight === null) throw new AppError(400, "Indica tu peso actual.");
    if (supplied !== undefined && supplied !== previous?.pesoActualKg) {
      const metricDay = dayDate(localDay("America/Bogota", now));
      const latestToday = await tx.metricaDiaria.findFirst({
        where: {
          usuarioId, pesoActualKg: { not: null },
          fecha: { gte: new Date(`${localDay("America/Bogota", now)}T00:00:00-05:00`) },
        }, orderBy: [{ fecha: "desc" }, { id: "desc" }],
      });
      if (latestToday) {
        await tx.metricaDiaria.update({ where: { id: latestToday.id }, data: { pesoActualKg: supplied, pesoActualizadoEn: now } });
      } else {
        const daily = await tx.metricaDiaria.findFirst({ where: { usuarioId, diaLocal: metricDay, pesoActualizadoEn: null } });
        if (daily) {
          await tx.metricaDiaria.update({ where: { id: daily.id }, data: { pesoActualKg: supplied, fecha: now } });
        } else {
          await tx.metricaDiaria.create({ data: { usuarioId, fecha: now, pesoActualKg: supplied } });
        }
      }
    }
    await tx.nutricionPerfil.upsert({
      where: { usuarioId },
      create: { ...settings, usuarioId },
      update: settings,
    });
    await saveReference(tx, usuarioId, settings, weight, today);
  });
  return profile(usuarioId, false);
}

export async function catalog(usuarioId: string, filters: z.infer<typeof catalogInput>) {
  const [settings, favorites] = await Promise.all([
    db.profiles.findUnique({ where: { usuarioId } }),
    db.favorites.findMany({ where: { usuarioId }, select: { foodId: true } }),
  ]);
  const saved = new Set(favorites.map(({ foodId }) => foodId));
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const filtered = foods.filter((food) =>
    (!filters.q || normalize(food.name).includes(normalize(filters.q))) &&
    (!filters.category || food.category === filters.category) &&
    (!filters.origin || food.origin === filters.origin) &&
    (filters.favorite !== "true" || saved.has(food.id)) &&
    (filters.compatible !== "true" || !settings || compatible(food, settings))
  ).sort((a, b) => filters.sort === "proteina" ? b.protein - a.protein : a.name.localeCompare(b.name, "es"));
  return {
    items: filtered.slice((filters.page - 1) * 12, filters.page * 12).map((food) => ({ ...food, favorite: saved.has(food.id) })),
    total: filtered.length,
    categories: [...new Set(foods.map((food) => food.category))],
    favorites: [...saved],
  };
}

export async function suggested(usuarioId: string) {
  const settings = await db.profiles.findUnique({ where: { usuarioId } });
  if (!settings || settings.needsProfessional) return [];
  const earliestAge = Number(localDay(settings.zone).slice(0, 4)) - settings.birthYear - 1;
  if (earliestAge < 18 || earliestAge >= 64) return [];
  return recommendations(settings);
}

export async function favorite(usuarioId: string, foodId: number, enabled: boolean) {
  findFood(foodId);
  const key = { usuarioId, foodId };
  if (enabled) await db.favorites.upsert({ where: { usuarioId_foodId: key }, create: key, update: {} });
  else await db.favorites.deleteMany({ where: key });
}

export async function quoteEntry(usuarioId: string, id: string, foodId: number, quantity: number, unit: string) {
  const record = await db.entries.findFirst({ where: { usuarioId, id, foodId } });
  if (!record) throw new AppError(404, "Registro no encontrado.");
  return contribution(record.snapshot as unknown as Food, quantity, unit);
}

export async function saveEntry(usuarioId: string, input: z.infer<typeof entryInput> & { requestId?: string }, id?: string) {
  const retryId = input.requestId ? uuidForRequest(input.requestId, usuarioId) : undefined;
  return db.transaction(usuarioId, async (tx) => {
    const settings = await tx.nutricionPerfil.findUnique({ where: { usuarioId } });
    const existing = id ? await tx.nutricionRegistro.findFirst({ where: { usuarioId, id } }) : null;
    if (id && !existing) throw new AppError(404, "Registro no encontrado.");
    if (!id && retryId) {
      const previous = await tx.nutricionRegistro.findFirst({
        where: { usuarioId, id: retryId }, omit: { usuarioId: true },
      });
      if (previous) {
        if (dayKey(previous.day) !== input.day || previous.foodId !== input.foodId ||
            previous.quantity !== input.quantity || previous.unit !== input.unit || previous.meal !== input.meal) {
          throw new AppError(409, "La solicitud de registro ya se utilizó con otros datos.");
        }
        return previous;
      }
    }
    if (!settings || (!id && !settings.tracking)) throw new AppError(409, "Activa el registro en tu perfil nutricional.");
    if (input.day > localDay(settings.zone)) throw new AppError(400, "Selecciona una fecha hasta hoy.");
    if (existing && existing.foodId !== input.foodId) throw new AppError(400, "El alimento de un registro existente se conserva.");
    const food = existing ? existing.snapshot as unknown as Food : findFood(input.foodId);
    const { quantity, unit, meal } = input;
    const data = { ...contribution(food, quantity, unit), quantity, unit, meal, day: dayDate(input.day) };
    if (existing) {
      const { usuarioId: _owner, ...entry } = await tx.nutricionRegistro.update({ where: { id: existing.id, usuarioId }, data });
      return entry;
    }
    return tx.nutricionRegistro.create({
      data: { ...data, id: retryId, usuarioId, foodId: food.id, snapshot: { ...food } as Prisma.InputJsonValue },
      omit: { usuarioId: true },
    });
  });
}

export async function removeEntry(usuarioId: string, id: string) {
  const result = await db.entries.deleteMany({ where: { usuarioId, id } });
  if (!result.count) throw new AppError(404, "Registro no encontrado.");
}

export async function history(usuarioId: string, options: z.infer<typeof historyInput>) {
  const end = dayDate(options.day);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - options.days + 1);
  const where = { usuarioId, day: { gte: start, lte: end }, meal: options.meal, foodId: options.foodId };
  const [entries, total, daily, meals, frequent, references, initial] = await Promise.all([
    db.entries.findMany({ where, orderBy: [{ day: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: (options.page - 1) * pageSize, take: pageSize, omit: { usuarioId: true } }),
    db.entries.count({ where }),
    db.entries.groupBy({ by: ["day"], where, _sum: { protein: true } }),
    db.entries.groupBy({ by: ["meal"], where, _sum: { protein: true } }),
    db.entries.groupBy({ by: ["foodId"], where, _count: { foodId: true }, orderBy: [{ _count: { foodId: "desc" } }, { foodId: "asc" }], take: 5 }),
    db.references.findMany({ where: { usuarioId, day: { gte: start, lte: end } }, orderBy: [...newest], omit: { usuarioId: true } }),
    db.references.findFirst({ where: { usuarioId, day: { lt: start } }, orderBy: [...newest], omit: { usuarioId: true } }),
  ]);
  const days = Array.from({ length: options.days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const recorded = daily.find(({ day }) => +day === +date);
    const active = references.find(({ day }) => day <= date) ?? initial;
    return { day: dayKey(date), protein: recorded ? twoDecimals(recorded._sum.protein ?? 0) : null,
      reference: active?.minimum == null ? null : { minimum: active.minimum, maximum: active.maximum } };
  });
  return {
    entries, total, pageSize, days, daysRecorded: daily.length, references,
    average: daily.length ? twoDecimals(daily.reduce((sum, value) => sum + (value._sum.protein ?? 0), 0) / daily.length) : null,
    meals: meals.map(({ meal, _sum }) => ({ meal, protein: twoDecimals(_sum.protein ?? 0) })),
    frequent: frequent.map(({ foodId, _count }) => ({
      foodId, name: foods.find((food) => food.id === foodId)?.name ?? "Alimento archivado", count: _count.foodId,
    })),
  };
}

export async function mealsForUser(usuarioId: string) {
  const settings = await db.profiles.findUnique({ where: { usuarioId } });
  return mealIdeas(settings);
}

export async function summaryForHome(usuarioId: string) {
  const { settings, today, reference } = await profile(usuarioId);
  if (!settings) return { configured: false } as const;
  const protein = settings.tracking ? (await db.entries.aggregate({
    where: { usuarioId, day: dayDate(today) },
    _sum: { protein: true },
  }))._sum.protein : null;
  return {
    configured: true, goal: settings.goal, tracking: settings.tracking,
    reference: reference?.currentEstimate ?? null,
    protein: protein === null ? null : twoDecimals(protein),
  } as const;
}
