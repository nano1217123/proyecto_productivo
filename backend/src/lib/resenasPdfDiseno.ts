import type { FiltrosReporteResenas, SeccionReporteResenas } from "../types/resenas.types.js";

const negro = "#181818";
const dorado = "#D8B45A";
const papel = "#F6F4EE";
const fecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota",
});
const decimal = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const porcentaje = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 });
const estrellas = [5, 4, 3, 2, 1] as const;

export function estadisticasResenas(filas: readonly { calificacion: number }[]) {
  const conteos = [0, 0, 0, 0, 0, 0];
  let suma = 0;
  for (const { calificacion } of filas) {
    conteos[calificacion]++;
    suma += calificacion;
  }
  const total = filas.length;
  return {
    total, promedio: total ? suma / total : null,
    altas: conteos[4] + conteos[5],
    distribucion: estrellas.map(valor => ({
      valor, cantidad: conteos[valor], proporcion: total ? conteos[valor] / total : null,
    })),
  };
}

function* lineas(doc: PDFKit.PDFDocument, texto: string, ancho: number) {
  for (const parrafo of texto.split("\n")) {
    let linea = "";
    for (const palabra of parrafo.match(/\S+\s*|\s+/gu) ?? []) {
      if (doc.widthOfString(linea + palabra) <= ancho) {
        linea += palabra;
        continue;
      }
      if (linea) yield linea;
      linea = "";
      if (doc.widthOfString(palabra) <= ancho) {
        linea = palabra;
        continue;
      }
      for (const letra of palabra) {
        if (doc.widthOfString(linea + letra) > ancho) {
          yield linea;
          linea = "";
        }
        linea += letra;
      }
    }
    yield linea;
  }
}

export function dibujarReporteResenas(
  doc: PDFKit.PDFDocument, secciones: SeccionReporteResenas[],
  filtros: FiltrosReporteResenas, consolidado: boolean, normalizarComentario: (valor: string) => string,
) {
  const x = 48, ancho = doc.page.width - 2 * x, fondo = doc.page.height - 49;
  const titulo = consolidado ? "Consolidado de sedes" : secciones[0].nombre;
  const global = estadisticasResenas(secciones.flatMap(s => s.filas));
  const mostrar = (n: number | null) => n === null ? "—" : decimal.format(n) + " / 5";
  let y = 48;
  function texto(valor: string, izquierda: number, arriba: number, tam: number, color = negro) {
    doc.fontSize(tam).fillColor(color).text(valor, izquierda, arriba, { lineBreak: false });
  }
  function encabezado(alcance: string) {
    doc.rect(x, 48, ancho, 50).fill(negro);
    doc.rect(x, 98, ancho, 3).fill(dorado);
    texto("J&JGym", x + 12, 55, 21, "#FFFFFF");
    texto(alcance, x + 13, 82, 10, "#FFFFFF");
    y = 112;
  }
  function columnas(titulos: string[], posiciones: number[]) {
    doc.rect(x, y, ancho, 21).fill(negro);
    titulos.forEach((t, i) => texto(t, x + posiciones[i], y + 4, 9, "#FFFFFF"));
    y += 21;
  }
  function fila(celdas: string[], posiciones: number[], alterna: boolean) {
    if (alterna) doc.rect(x, y, ancho, 18).fill(papel);
    celdas.forEach((celda, i) => texto(celda, x + posiciones[i], y + 3, 9));
    y += 18;
  }

  encabezado(titulo);
  texto("Reporte administrativo de reseñas", x, y, 16);
  y += 27;
  texto(`Período: ${filtros.desde ?? "sin inicio"} — ${filtros.hasta ?? "sin fin"}`, x, y, 10);
  texto(`Generado: ${fecha.format(new Date())} (America/Bogota)`, x, y + 16, 10);
  y += 40;
  doc.rect(x, y, ancho, 46).fill(papel);
  texto(`Reseñas: ${global.total}`, x + 10, y + 12, 13);
  texto(`Promedio: ${mostrar(global.promedio)}`, x + 157, y + 12, 13);
  if (consolidado) texto(`Sedes vigentes: ${secciones.length}`, x + 330, y + 12, 12);
  y += 60;

  texto("Distribución de valoraciones", x, y, 12);
  y += 21;
  columnas(["Valoración", "Reseñas", "Porcentaje"], [8, 155, 315]);
  global.distribucion.forEach((d, i) => fila([
    `${d.valor} / 5`, String(d.cantidad), d.proporcion === null ? "—" : porcentaje.format(d.proporcion),
  ], [8, 155, 315], i % 2 === 0));
  y += 13;
  texto("Resumen administrativo", x, y, 12);
  y += 19;
  texto(global.total
    ? `${global.altas} de ${global.total} reseñas tuvieron una valoración de 4 o 5.`
    : "Sin reseñas en el período.", x, y, 10);
  y += 27;

  if (consolidado) {
    const comparar = () => {
      if (y + 45 > fondo) { doc.addPage(); encabezado(titulo); }
      texto("Comparativo de sedes", x, y, 12);
      y += 19;
      columnas(["Sede", "Reseñas", "Promedio"], [8, 282, 382]);
    };
    comparar();
    secciones.forEach((s, i) => {
      if (y + 18 > fondo) { doc.addPage(); encabezado(titulo); comparar(); }
      const estadisticas = estadisticasResenas(s.filas);
      fila([s.nombre, String(estadisticas.total), mostrar(estadisticas.promedio)], [8, 282, 382], i % 2 === 0);
    });
    y += 17;
  }

  const detalle = (nombre: string, nueva: boolean) => {
    if (nueva) { doc.addPage(); encabezado(titulo); }
    texto(consolidado ? `Detalle · ${nombre}` : "Detalle de reseñas", x, y, 12);
    y += 20;
    columnas(["Fecha y hora (Bogotá)", "Valoración", "Comentario"], [7, 139, 213]);
  };
  for (const { nombre, filas } of secciones) {
    detalle(nombre, y + 75 > fondo);
    if (!filas.length) fila(["Sin reseñas en el período."], [7], true);
    for (const [i, reseña] of filas.entries()) {
      const comentario = normalizarComentario(reseña.comentario ?? "") || "—";
      doc.fontSize(9);
      let primera = true;
      for (const linea of lineas(doc, comentario, ancho - 222)) {
        let continuacion = false;
        if (y + 15 > fondo) { detalle(nombre, true); continuacion = !primera; }
        if (i % 2 === 0) doc.rect(x, y, ancho, 15).fill(papel);
        if (primera) {
          texto(fecha.format(reseña.creado_en), x + 7, y + 2, 9);
          texto(`${reseña.calificacion} / 5`, x + 139, y + 2, 9);
        } else if (continuacion) texto("Comentario (cont.)", x + 7, y + 2, 9);
        texto(linea, x + 213, y + 2, 9);
        y += 15;
        primera = false;
      }
    }
    y += 18;
  }
}
