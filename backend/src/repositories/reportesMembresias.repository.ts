import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export type FilaMembresia = { sede: string; alta: Date; nombre: string };
type Resultado = { estado: "ok" | "prohibido" | "limite"; sede: string | null; alta: Date | null; nombre: string | null };

export async function consultarMembresias(
  sedes: readonly string[], adminId: string | null, desde: string | undefined,
  hasta: string | undefined, maxFilas: number, maxBytes: number,
) {
  const filas = await prisma.$queryRaw<Resultado[]>(Prisma.sql`
    WITH permiso AS (
      SELECT (${adminId}::uuid IS NULL OR EXISTS (
        SELECT 1 FROM public.admin_sedes a
        WHERE a.usuario_id = ${adminId}::uuid AND a.gym_slug = ${sedes[0]}
      )) AS autorizado
    ), candidatas AS MATERIALIZED (
      SELECT m.id, m.gym_slug, m.creado_en, octet_length(u.nombres) + octet_length(u.apellidos) + 1 AS bytes
      FROM public.miembros_sede m JOIN public.usuarios u ON u.idusuario = m.usuario_id
      CROSS JOIN permiso p
      WHERE p.autorizado AND m.gym_slug = ANY(${[...sedes]}::text[])
        AND (${desde ?? null}::date IS NULL OR m.creado_en >=
          (${desde ?? null}::date::timestamp AT TIME ZONE 'America/Bogota'))
        AND (${hasta ?? null}::date IS NULL OR m.creado_en <
          ((${hasta ?? null}::date + 1)::timestamp AT TIME ZONE 'America/Bogota'))
      ORDER BY m.gym_slug COLLATE "C", m.creado_en DESC, m.id DESC LIMIT ${maxFilas + 1}
    ), resumen AS (
      SELECT CASE WHEN NOT p.autorizado THEN 'prohibido'
        WHEN c.total > ${maxFilas} OR c.bytes > ${maxBytes} OR c.campo > 4096 THEN 'limite'
        ELSE 'ok' END AS estado
      FROM permiso p CROSS JOIN
        (SELECT count(*) total, coalesce(sum(bytes),0) bytes, coalesce(max(bytes),0) campo FROM candidatas) c
    )
    SELECT r.estado, c.gym_slug AS sede, c.creado_en AS alta, concat_ws(' ', u.nombres, u.apellidos) AS nombre
    FROM resumen r LEFT JOIN candidatas c ON r.estado = 'ok'
    LEFT JOIN public.miembros_sede m ON m.id = c.id
    LEFT JOIN public.usuarios u ON u.idusuario = m.usuario_id
    ORDER BY c.gym_slug COLLATE "C", c.creado_en DESC, c.id DESC`);
  if (!filas.length) throw new Error("La consulta de membresías no devolvió su estado.");
  return { estado: filas[0].estado, filas: filas.flatMap(f =>
    f.sede && f.alta && f.nombre !== null ? [{ sede: f.sede, alta: f.alta, nombre: f.nombre }] : []) };
}
