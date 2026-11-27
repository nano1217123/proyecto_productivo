# Reportes de reseñas por sede y consolidados

El PDF administrativo presenta período, generación en Bogotá, total, promedio,
distribución de las cinco valoraciones y cantidad de reseñas de 4 o 5.
El consolidado añade el comparativo de sedes y separa su detalle por gimnasio.
Los encabezados de detalle se repiten al continuar en otra página.

`GET /api/resenas/gimnasio/:gymSlug/reporte.csv` admite `desde` y `hasta` opcionales en formato `YYYY-MM-DD`. Ambos incluyen el día completo en Bogotá. La columna `fecha` se exporta en UTC.

El PDF por sede usa `/api/resenas/gimnasio/:gymSlug/reporte.pdf`. Los consolidados usan
`/api/resenas/reportes/consolidado.csv` y `/api/resenas/reportes/consolidado.pdf` y requieren
`super_admin`. Los tres endpoints admiten los mismos filtros. El consolidado incluye
solo el catálogo vigente, en orden de slug, y ordena las reseñas de cada sede por
fecha descendente e ID descendente. Las sedes sin reseñas aparecen con una sección
de cero registros en el PDF y una fila `sede,,,"0 reseñas"` en el CSV (el slug
queda entre comillas). La fecha y la calificación vacías distinguen esta fila
informativa de una reseña. Estas filas informativas no cuentan en el límite de
5.000 reseñas y sí cuentan en el tamaño final del CSV.

El PDF muestra fechas en Bogotá y calcula el promedio general sumando todas las
calificaciones y dividiendo por el número de reseñas. Solo utiliza datos
exportables y dibuja los comentarios como texto. La fuente Noto Sans Latin se
distribuye con `@fontsource/noto-sans` bajo SIL OFL 1.1 (licencia en el paquete).
El backend carga el archivo de fuente local. La cobertura tipográfica prevista
es la del subconjunto latino, incluidos los caracteres del español. El PDF
representa los caracteres fuera de esa cobertura y los controles invisibles
como `[U+XXXX]`. Conserva los saltos de línea y el CSV conserva el texto original
con su protección de fórmulas.

## Autorización y límites

- El administrador debe estar asignado a la sede. La API lo verifica al comienzo y de nuevo en la misma sentencia que lee las reseñas, usando su ID autenticado. Una revocación confirmada antes de la instantánea de esa sentencia devuelve `403`. Una revocación posterior no puede retirar una respuesta que ya se autorizó bajo esa instantánea. El superadministrador puede solicitar cualquier sede válida.
- El CSV por sede sin reseñas contiene solo los encabezados. El PDF por sede indica que no hubo reseñas en el período. El CSV consolidado incluye una fila informativa sin fecha ni calificación por cada sede sin reseñas. El PDF consolidado muestra cada sede vigente e indica si tiene cero reseñas.
- Si el CSV supera 5.000 reseñas o 8 MiB, se devuelve `422` sin adjunto. El SQL calcula primero el tamaño acumulado de los comentarios almacenados. Si ese tamaño excede el límite, los textos completos no se devuelven al proceso. El serializador también mide los bytes UTF-8 del archivo final, incluidos BOM, encabezado, escape y prefijos, antes de enviar la respuesta.
- La cuota de diez solicitudes por minuto y usuario se aplica después de verificar la sesión y antes de consultar el rol. El almacén en memoria elimina los contadores vencidos al rotar sus ventanas. La cuota es por instancia y no equivale a una cuota global.
- La cuota se comparte entre formatos y alcances. El PDF admite hasta 500 reseñas,
  1 MiB de comentarios en la consulta, 100 páginas y 4 MiB de salida. Se admiten
  hasta dos PDF activos por instancia. Superar los límites de contenido devuelve
  `422` sin adjunto y superar la concurrencia devuelve `429`. El PDF se completa
  antes de enviar la respuesta.
- El generador comprueba y drena cada fragmento PDF emitido. El presupuesto
  acota los bytes serializados admitidos y detiene la generación antes de
  encolar un fragmento que lo exceda. El presupuesto no cubre la memoria total
  del proceso, incluidos la composición de páginas, fuentes, compresión y la
  copia final del búfer.

## Comentarios exportados como texto

El CSV usa UTF-8 con BOM, comas, comillas dobles para campos de texto y finales de registro CRLF. Los comentarios con iniciadores de fórmula, incluidas variantes Unicode, o con prefijos de control o formato reciben la marca visible `[texto] `. La detección también contempla espacios y apóstrofos iniciales que un importador podría interpretar de forma especial. La marca se conserva como parte del valor exportado. El comentario almacenado en la base queda intacto.

La prueba automatizada analiza el CSV, vuelve a guardar sus celdas con punto y coma y las analiza de nuevo. Queda pendiente la verificación en Excel de escritorio:

1. Descargar un reporte sintético con comentarios que tengan iniciadores de fórmula, espacios, tabulaciones, saltos de línea, caracteres de formato invisibles, comas, punto y coma, comillas y tildes.
2. Abrir el CSV en Excel y confirmar que la primera fila muestra las cuatro columnas. Si la configuración regional no detecta la coma, importar con **Datos → Desde texto/CSV** y seleccionar UTF-8 y coma.
3. Confirmar que los comentarios de prueba se muestran como texto con la marca visible, no son fórmulas y conservan sus límites de celda.
4. Guardar una copia como CSV UTF-8 y reabrirla en Excel. Repetir la comprobación y registrar versión, configuración regional, método de importación y resultado.
