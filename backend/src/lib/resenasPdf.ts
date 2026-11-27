import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import PDFDocument from "pdfkit";
import { dibujarReporteResenas } from "./resenasPdfDiseno.js";
import type { FiltrosReporteResenas, SeccionReporteResenas } from "../types/resenas.types.js";

const resolver = createRequire(import.meta.url);
const fuente = resolver.resolve("@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff");
const cobertura = JSON.parse(readFileSync(resolver.resolve("@fontsource/noto-sans/unicode.json"), "utf8")) as { latin: string };
const rangos = cobertura.latin.split(",").map(rango => rango.slice(2).split("-").map(n => parseInt(n, 16)));
const margen = 48;

export function comentarioParaPdf(comentario: string): string {
  return comentario.normalize("NFC").replace(/\r\n?/g, "\n").replace(/[^\x20-\x7E\n]/gu, caracter => {
    const codigo = caracter.codePointAt(0)!;
    if (!/[\p{Cc}\p{Cf}]/u.test(caracter) && rangos.some(([inicio, fin = inicio]) => codigo >= inicio && codigo <= fin)) {
      return caracter;
    }
    return `[U+${codigo.toString(16).toUpperCase().padStart(4, "0")}]`;
  });
}

export function generarPdfAcotado(
  dibujar: (doc: PDFKit.PDFDocument) => void,
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
      dibujar(doc);
      doc.end();
    } catch (error) {
      partes.length = 0;
      doc.destroy();
      if (error === limitePaginas || error === limiteBytes) resolve(null);
      else reject(error);
    }
  });
}

export function generarPdfResenas(
  secciones: SeccionReporteResenas[],
  filtros: FiltrosReporteResenas,
  consolidado: boolean,
  maxBytes: number,
  maxPaginas = 100,
): Promise<Buffer | null> {
  return generarPdfAcotado(
    doc => dibujarReporteResenas(doc, secciones, filtros, consolidado, comentarioParaPdf),
    maxBytes, maxPaginas,
  );
}
