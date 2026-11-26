import type { FilaReporteResenas } from "../types/resenas.types.js";

function escaparTexto(valor: string): string {
  return '"' + valor.replaceAll('"', '""') + '"';
}

function prefijoComentario(comentario: string): string {
  const posibleFormula = /^[\s']*[=+\-@＝＋－＠﹦﹢﹣﹫]/u.test(comentario) ||
    /^[\s']*[\p{Cc}\p{Cf}]/u.test(comentario);
  // La marca es visible y forma parte del texto de la celda.
  return posibleFormula ? "[texto] " : "";
}

export function generarCsvResenas(filas: FilaReporteResenas[], maxBytes: number): string | null {
  const encabezado = "\uFEFFsede,fecha,calificacion,comentario\r\n";
  const lineas = [encabezado];
  let bytes = Buffer.byteLength(encabezado, "utf8");
  if (bytes > maxBytes) return null;

  for (const fila of filas) {
    const datos = [
      escaparTexto(fila.gym_slug),
      fila.creado_en.toISOString(),
      fila.calificacion,
    ].join(",") + ",";
    const comentario = fila.comentario ?? "";
    const prefijo = prefijoComentario(comentario);
    bytes += Buffer.byteLength(datos + prefijo, "utf8")
      + Buffer.byteLength(comentario, "utf8") + 4; // Dos comillas y CRLF.
    for (let i = comentario.indexOf('"'); i !== -1 && bytes <= maxBytes; i = comentario.indexOf('"', i + 1)) {
      bytes++;
    }
    if (bytes > maxBytes) return null;
    lineas.push(datos + escaparTexto(prefijo + comentario) + "\r\n");
  }
  return lineas.join("");
}
