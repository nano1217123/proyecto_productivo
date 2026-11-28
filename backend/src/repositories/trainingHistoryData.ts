import type { Prisma } from "../generated/prisma/client.js";
import { generateId } from "../lib/uuid.js";
import type { ContenidoSesion } from "../validator/sesionEntrenamiento.validator.js";

export function filasSesion(usuarioId: string, entrenamientoId: string, ejercicios: ContenidoSesion["ejercicios"]) {
  return ejercicios.flatMap((item) => item.series.map((s, index) => ({
    id: generateId(), usuarioId, entrenamientoId, ejercicioId: BigInt(item.ejercicio_id),
    tipo: item.tipo, numeroSerie: index + 1, pesoKg: s.peso_kg, repeticiones: s.repeticiones,
    duracionSeg: s.duracion_seg, distanciaKm: s.distancia_km, asistenciaKg: s.asistencia_kg,
  })));
}

export async function catalogoHistorico(tx: Prisma.TransactionClient, contenido: ContenidoSesion) {
  const ids = [...new Set(contenido.ejercicios.map((item) => BigInt(item.ejercicio_id)))];
  const ejercicios = await tx.ejercicio.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true, grupoNombre: true, musculoPrincipal: true, equipo: true, imagenUrl: true },
  });
  return Object.fromEntries(ejercicios.map((j) => [String(j.id), {
    nombre: j.nombre, grupo: j.grupoNombre, musculo: j.musculoPrincipal, equipo: j.equipo, imagen: j.imagenUrl,
  }]));
}
