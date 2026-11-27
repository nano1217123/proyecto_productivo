import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import PDFDocument from "pdfkit";
import type { FiltrosReporteResenas, SeccionReporteResenas } from "../types/resenas.types.js";

const resolver = createRequire(import.meta.url);
const fuente = resolver.resolve("@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff");
const cobertura = JSON.parse(readFileSync(resolver.resolve("@fontsource/noto-sans/unicode.json"), "utf8")) as { latin: string };
const rangos = cobertura.latin.split(",").map(rango => rango.slice(2).split("-").map(n => parseInt(n, 16)));
const fechaBogota = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});
const promedio = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const margen = 48;

function comentarioParaPdf(comentario: string): string {
  return comentario.normalize("NFC").replace(/\r\n?/g, "\n").replace(/[^\x20-\x7E\n]/gu, caracter => {
    const codigo = caracter.codePointAt(0)!;
    if (!/[\p{Cc}\p{Cf}]/u.test(caracter) && rangos.some(([inicio, fin = inicio]) => codigo >= inicio && codigo <= fin)) {
      return caracter;
    }
    return `[U+${codigo.toString(16).toUpperCase().padStart(4, "0")}]`;
  });
}

export function generarPdfResenas(
  secciones: SeccionReporteResenas[],
  filtros: FiltrosReporteResenas,
  consolidado: boolean,
  maxBytes: number,
  maxPaginas = 100,
): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, size: "A4", margin: margen });
    const partes: Buffer[] = [];
    let bytes = 0;
    let paginas = 0;
    const limiteBytes = new Error("Límite de bytes");
    const limitePaginas = new Error("Límite de páginas");
    const push = doc.push.bind(doc);
    const recoger = () => {
      const parte: Buffer | null = doc.read();
      if (parte) {
        bytes += parte.length;
        partes.push(parte);
      }
    };
    doc.once("error", (error) => {
      partes.length = 0;
      doc.destroy();
      reject(error);
    });
    doc.once("end", () => {
      resolve(Buffer.concat(partes, bytes));
    });

    // PDFKit escribe de forma síncrona e ignora el retorno de push.
    // Comprobamos cada fragmento antes de encolarlo y lo drenamos de inmediato.
    doc.push = (parte: Buffer | null) => {
      if (parte && parte.length > maxBytes - bytes) throw limiteBytes;
      const continuar = push(parte);
      if (parte) recoger();
      else doc.read(0);
      return continuar;
    };

    doc.on("pageAdded", () => {
      if (++paginas > maxPaginas) throw limitePaginas;
      const { x, y } = doc;
      const { width, height } = doc.page;
      doc.save().fillColor("#444444")
        .text(`Página ${paginas}`, width - 104, height - 30, { lineBreak: false });
      doc.restore();
      doc.x = x;
      doc.y = y;
    });

    try {
      // PDFKit escribe la cabecera durante el constructor.
      if (doc.readableLength > maxBytes) throw limiteBytes;
      recoger();
      doc.font(fuente).addPage();
      const total = secciones.reduce((n, s) => n + s.filas.length, 0);
      const suma = secciones.reduce((n, s) => n + s.filas.reduce((acc, f) => acc + f.calificacion, 0), 0);
      doc.fontSize(22).text("J&JGym");
      doc.fontSize(17).text("Reporte de reseñas");
      doc.fontSize(12).text(consolidado ? "Consolidado de gimnasios vigentes" : secciones[0].nombre);
      doc.moveDown(0.5).fontSize(10)
        .text(`Periodo: ${filtros.desde ?? "sin fecha inicial"} a ${filtros.hasta ?? "sin fecha final"}`)
        .text(`Generado: ${fechaBogota.format(new Date())} (America/Bogota)`);
      if (consolidado) doc.text(`Gimnasios vigentes: ${secciones.length}`);
      doc.text(`Total de reseñas: ${total}`);
      if (total) doc.text(`Calificación promedio: ${promedio.format(suma / total)} / 5`);

      for (const { nombre, filas } of secciones) {
        if (doc.y > doc.page.height - margen - 72) doc.addPage();
        if (consolidado) doc.moveDown().fontSize(14).text(nombre);
        doc.fontSize(10);
        if (!filas.length) doc.moveDown(0.5).text("0 reseñas en el periodo.");
        for (const fila of filas) {
          if (doc.y > doc.page.height - margen - 48) doc.addPage();
          doc.moveDown(0.5)
            .text(`${fechaBogota.format(fila.creado_en)} · ${fila.calificacion} / 5`)
            .text(comentarioParaPdf(fila.comentario ?? ""));
        }
      }
      doc.end();
    } catch (error) {
      partes.length = 0;
      doc.destroy();
      if (error === limitePaginas || error === limiteBytes) resolve(null);
      else reject(error);
    }
  });
}
