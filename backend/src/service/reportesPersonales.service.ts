import { AppError } from "../errors/AppError.js";
import { generarPdfAcotado, comentarioParaPdf } from "../lib/resenasPdf.js";
import { escaparTexto, prefijoComentario } from "../lib/resenasCsv.js";
import { consultarReportePersonal, type TipoReportePersonal, type FiltrosReportePersonal } from "../repositories/reportesPersonales.repository.js";

const columnas = {
  progreso: ["Fecha", "Peso corporal (kg)", "Entrenamiento completado"],
  rutinas: ["Fecha de creación", "Rutina", "Día", "Orden", "Ejercicio"],
  ejercicios: ["Fecha", "Ejercicio", "Serie", "Repeticiones", "Peso (kg)"],
};
const exceso = () => new AppError(422, "El reporte supera los límites. Reduce el rango de fechas.");
let pdfActivos = 0;

export async function exportarReportePersonal(
  usuarioId: string, tipo: TipoReportePersonal, formato: "csv" | "pdf", filtros: FiltrosReportePersonal,
) {
  const pdf = formato === "pdf";
  if (pdf && pdfActivos >= 2) throw new AppError(429, "Hay demasiados PDF en preparación.");
  if (pdf) pdfActivos++;
  try {
    const maxFilas = pdf ? 500 : 5000;
    const filas = await consultarReportePersonal(usuarioId, tipo, filtros, maxFilas + 1);
    if (filas.length > maxFilas || filas.some(fila => fila.exceso)) throw exceso();
    const encabezados = columnas[tipo];
    if (pdf) {
      const entrada = filas.reduce((total, fila) => total +
        fila.celdas.reduce((n, valor) => n + Buffer.byteLength(valor ?? ""), 0), 0);
      if (entrada > 1024 * 1024) throw exceso();
      const archivo = await generarPdfAcotado(doc => {
        doc.fontSize(20).text(`J&JGym · Reporte de ${tipo}`);
        doc.fontSize(11).text(`${filtros.desde ?? "Sin fecha inicial"} — ${filtros.hasta ?? "Sin fecha final"} (America/Bogota)`);
        if (!filas.length) doc.moveDown().text("Sin registros en el período.");
        for (const { celdas } of filas) {
          doc.moveDown(0.5);
          celdas.forEach((valor, i) => doc.text(`${encabezados[i]}: ${comentarioParaPdf(valor ?? "—")}`));
        }
      }, 4 * 1024 * 1024);
      if (!archivo) throw exceso();
      return archivo;
    }
    const partes = ["\uFEFF" + encabezados.map(escaparTexto).join(",") + "\r\n"];
    let bytes = Buffer.byteLength(partes[0]);
    for (const { celdas } of filas) {
      const linea = celdas.map(valor => escaparTexto(prefijoComentario(valor ?? "") + (valor ?? ""))).join(",") + "\r\n";
      bytes += Buffer.byteLength(linea);
      if (bytes > 8 * 1024 * 1024) throw exceso();
      partes.push(linea);
    }
    return partes.join("");
  } finally {
    if (pdf) pdfActivos--;
  }
}
