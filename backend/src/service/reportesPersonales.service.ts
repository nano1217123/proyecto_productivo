import { AppError } from "../errors/AppError.js";
import { generarPdfAcotado, comentarioParaPdf } from "../lib/resenasPdf.js";
import { escaparTexto, prefijoComentario } from "../lib/resenasCsv.js";
import { consultarReportePersonal, type TipoReportePersonal, type FiltrosReportePersonal } from "../repositories/reportesPersonales.repository.js";

const columnas = {
  progreso: ["Fecha", "Peso corporal (kg)", "Entrenamiento completado"],
  rutinas: ["Fecha de creación", "Rutina", "Día", "Orden", "Ejercicio", "Días planificados", "Estado"],
  ejercicios: ["Fecha", "Ejercicio", "Serie", "Repeticiones", "Peso (kg)", "Tipo", "Duración (s)", "Distancia (km)", "Asistencia (kg)"],
};
const mensajes = {
  sin_datos: "No hay datos suficientes para descargar este reporte en el período seleccionado.",
  campo: "Un campo de un registro supera el tamaño permitido. Selecciona un período que excluya ese registro.",
  filas: "El reporte supera la cantidad máxima de filas. Reduce el rango de fechas.",
  bytes: "El conjunto de datos supera el tamaño permitido. Reduce el rango de fechas.",
};
let pdfActivos = 0;

export async function exportarReportePersonal(
  usuarioId: string, tipo: TipoReportePersonal, formato: "csv" | "pdf", filtros: FiltrosReportePersonal,
) {
  const pdf = formato === "pdf";
  if (pdf && pdfActivos >= 2) throw new AppError(429, "Hay demasiados PDF en preparación.");
  if (pdf) pdfActivos++;
  try {
    const maxFilas = pdf ? 500 : 5000;
    const maxEntrada = (pdf ? 1 : 8) * 1024 * 1024;
    const resultado = await consultarReportePersonal(usuarioId, tipo, filtros, maxFilas, maxEntrada);
    const estado = resultado[0]?.estado;
    if (!estado) throw new Error("La consulta de reportes no devolvió su estado.");
    if (estado !== "ok") throw new AppError(422, mensajes[estado]);
    const filas = resultado.map(({ celdas }) => {
      if (!celdas) throw new Error("La consulta de reportes devolvió una fila incompleta.");
      return celdas;
    });
    const encabezados = columnas[tipo];
    if (pdf) {
      const archivo = await generarPdfAcotado(doc => {
        doc.fontSize(20).text(`J&JGym · Reporte de ${tipo}`);
        doc.fontSize(11).text(`${filtros.desde ?? "Sin fecha inicial"} — ${filtros.hasta ?? "Sin fecha final"} (America/Bogota)`);
        for (const celdas of filas) {
          doc.moveDown(0.5);
          celdas.forEach((valor, i) => doc.text(`${encabezados[i]}: ${comentarioParaPdf(valor ?? "—")}`));
        }
      }, 4 * 1024 * 1024);
      if (!archivo) throw new AppError(422, "El PDF supera el tamaño o número de páginas permitido. Reduce el rango de fechas.");
      return archivo;
    }
    const partes = ["\uFEFF" + encabezados.map(escaparTexto).join(",") + "\r\n"];
    let bytes = Buffer.byteLength(partes[0]);
    for (const celdas of filas) {
      const linea = celdas.map(valor => escaparTexto(prefijoComentario(valor ?? "") + (valor ?? ""))).join(",") + "\r\n";
      bytes += Buffer.byteLength(linea);
      if (bytes > 8 * 1024 * 1024) throw new AppError(422, "El CSV supera el tamaño permitido. Reduce el rango de fechas.");
      partes.push(linea);
    }
    return partes.join("");
  } finally {
    if (pdf) pdfActivos--;
  }
}
