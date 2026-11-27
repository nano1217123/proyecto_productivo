import { prisma } from "../lib/prisma.js";

export type IdentidadReporte = {
  solicitudId: string;
  actorId: string;
  tipo: "resenas" | "progreso" | "rutinas" | "ejercicios" | "membresias";
  formato: "csv" | "pdf";
};
export type AlcanceReporte = { tipo: "personal" | "consolidado"; sede?: never } | { tipo: "sede"; sede: string };
export type EventoReporte = {
  evento: "archivo_generado" | "respuesta_finalizada" | "respuesta_interrumpida" | "solicitud_rechazada" | "error_generacion";
  resultado: "ok" | "sin_cuerpo" | "conexion_cerrada" | "invalidacion" | "sin_permiso" | "no_encontrado" |
    "no_procesable" | "cuota" | "otro_rechazo" | "error_interno" | "auditoria_no_disponible";
};

export async function insertarEventoReporte(
  identidad: IdentidadReporte, alcance: AlcanceReporte | null, evento: EventoReporte, ocurridoEn: Date,
) {
  await prisma.$executeRaw`
    INSERT INTO public.auditoria_reportes
      (solicitud_id, actor_id, tipo_reporte, formato, alcance, sede_slug, ocurrido_en, evento, resultado)
    VALUES (${identidad.solicitudId}::uuid, ${identidad.actorId}::uuid, ${identidad.tipo}, ${identidad.formato},
      ${alcance?.tipo ?? null}, ${alcance?.sede ?? null}, ${ocurridoEn}, ${evento.evento}, ${evento.resultado})
    ON CONFLICT (solicitud_id, evento) DO NOTHING`;
}
