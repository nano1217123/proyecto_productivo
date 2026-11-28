import { AppError } from "../errors/AppError.js";
import type { RutinasRepository } from "../repositories/rutinas.repository.js";
import { contenidoSesion, leerSesion, tipoRegistro } from "../validator/sesionEntrenamiento.validator.js";

type Rutina = NonNullable<Awaited<ReturnType<RutinasRepository["findByIdForUsuario"]>>>;
type Ejercicio = Rutina["ejercicios"][number];

function tipoSugerido(item: Ejercicio) {
  const equipo = item.equipo?.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase() || "";
  const texto = `${item.nombre} ${equipo}`.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (/estiramiento/.test(texto)) return "estiramiento";
  if (/movilidad/.test(texto)) return "movilidad";
  if (/plancha|isometric/.test(texto)) return "isometrico";
  if (/caminadora|eliptica|bicicleta estatica/.test(texto)) return "cardio";
  if (/asistid/.test(texto)) return "asistido";
  return equipo === "peso corporal" ? "corporal" : "fuerza";
}

export function rutinaSesion(rutina: Rutina) {
  if (rutina.archivada) throw new AppError(409, "Restaura la rutina antes de iniciar un entrenamiento.");
  if (!rutina.ejercicios.length) throw new AppError(400, "Agrega al menos un ejercicio antes de iniciar.");
  return leerSesion(contenidoSesion, {
    nombre: rutina.nombre,
    notas: rutina.notas ?? "",
    ejercicios: rutina.ejercicios.map((item) => {
      const plan = item.plan;
      const tipo = tipoRegistro.safeParse(plan.tipo).data ?? tipoSugerido(item);
      const porTiempo = ["cardio", "isometrico", "estiramiento"].includes(tipo) || (tipo === "movilidad" && plan.duracionSeg != null);
      return {
        ejercicio_id: item.ejercicio_id, tipo, descanso: plan.descanso ?? 60, notas: plan.notas ?? "",
        objetivo: {
          repeticiones: porTiempo ? null : plan.repeticiones,
          repeticiones_max: porTiempo ? null : plan.repeticionesMax,
          peso_kg: plan.pesoKg, asistencia_kg: plan.asistenciaKg, duracion_seg: plan.duracionSeg, distancia_km: plan.distanciaKm,
        },
        series: Array.from({ length: plan.series ?? 1 }, () => ({ completada: false })),
      };
    }),
  });
}
