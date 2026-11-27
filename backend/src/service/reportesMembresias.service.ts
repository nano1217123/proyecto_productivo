import { AppError } from "../errors/AppError.js";
import { SEDES } from "../lib/sedes.js";
import { escaparTexto, prefijoComentario } from "../lib/resenasCsv.js";
import { comentarioParaPdf, generarPdfAcotado } from "../lib/resenasPdf.js";
import { consultarMembresias } from "../repositories/reportesMembresias.repository.js";
import type { TipoUsuario } from "../types/usuario.types.js";

const bogota = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota",
});
const MiB = 1024 * 1024;
let pdfActivos = 0;

export async function exportarMembresias(
  actor: string, rol: TipoUsuario | undefined, slug: string | null, formato: "csv" | "pdf",
  { desde, hasta }: { desde?: string; hasta?: string },
) {
  if (rol !== "super_admin" && (rol !== "admin" || !slug)) throw new AppError(403, "Acceso denegado.");
  const sedes = SEDES.filter(s => slug === null || s.slug === slug);
  if (!sedes.length) throw new AppError(404, "Sede no encontrada.");
  const pdf = formato === "pdf";
  if (pdf && pdfActivos >= 2) throw new AppError(429, "Hay demasiados PDF en preparación.");
  if (pdf) pdfActivos++;
  try {
    const { estado, filas } = await consultarMembresias(
      sedes.map(s => s.slug), rol === "admin" ? actor : null, desde, hasta, pdf ? 500 : 5000, pdf ? MiB : 8 * MiB,
    );
    if (estado === "prohibido") throw new AppError(403, "No administras esta sede.");
    const exceso = new AppError(422, "El reporte excede los límites. Reduce el rango de fechas.");
    if (estado === "limite") throw exceso;
    if (pdf) {
      const archivo = await generarPdfAcotado(doc => {
        doc.fillColor("#321D47").fontSize(20).text("J&JGym | Membresías");
        doc.fillColor("#181818").fontSize(13).text(slug ? sedes[0].nombre : "Consolidado de sedes");
        doc.moveDown(0.5).fontSize(10)
          .text(`Fecha de vinculación (Bogotá): ${desde ?? "sin fecha inicial"} a ${hasta ?? "sin fecha final"}`)
          .text(`Vínculos actuales en el resultado: ${filas.length}`)
          .text("Cada vínculo corresponde a un usuario asignado actualmente a una sede.");
        for (const sede of sedes) {
          const miembros = filas.filter(f => f.sede === sede.slug);
          if (doc.y + 62 > doc.page.maxY()) doc.addPage();
          doc.moveDown().fillColor("#321D47").fontSize(13).text(`${sede.nombre} · ${miembros.length}`);
          doc.fillColor("#181818").fontSize(10);
          if (!miembros.length) doc.text("Sin vínculos actuales para el filtro.");
          for (const miembro of miembros) {
            doc.moveDown(0.4).text(`${bogota.format(miembro.alta)} · ${comentarioParaPdf(miembro.nombre)}`);
          }
        }
      }, 4 * MiB);
      if (!archivo) throw exceso;
      return archivo;
    }
    const celdas = (valores: string[]) => valores.map(v => escaparTexto(prefijoComentario(v) + v)).join(",") + "\r\n";
    const partes = ["\uFEFFsede,fecha_vinculacion_utc,miembro,estado\r\n"];
    let bytes = Buffer.byteLength(partes[0]);
    for (const sede of sedes) {
      const miembros = filas.filter(f => f.sede === sede.slug);
      const lineas = miembros.length ? miembros.map(f => [sede.slug, f.alta.toISOString(), f.nombre, "vínculo actual"])
        : [[sede.slug, "", "", "sin vínculos actuales para el filtro"]];
      for (const valores of lineas) {
        const linea = celdas(valores);
        bytes += Buffer.byteLength(linea);
        if (bytes > 8 * MiB) throw exceso;
        partes.push(linea);
      }
    }
    return partes.join("");
  } finally {
    if (pdf) pdfActivos--;
  }
}
