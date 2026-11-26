# Reporte CSV de reseñas por sede

`GET /api/resenas/gimnasio/:gymSlug/reporte.csv` admite `desde` y `hasta` opcionales en formato `YYYY-MM-DD`. Ambos incluyen el día completo en Bogotá. La columna `fecha` se exporta en UTC.

## Autorización y límites

- El administrador debe estar asignado a la sede. La API lo verifica al comienzo y de nuevo en la misma sentencia que lee las reseñas, usando su ID autenticado. Una revocación confirmada antes de la instantánea de esa sentencia devuelve `403`. Una revocación posterior no puede retirar una respuesta que ya se autorizó bajo esa instantánea. El superadministrador puede solicitar cualquier sede válida.
- Un reporte autorizado sin filas devuelve solo el encabezado. Si se supera el máximo de 5.000 filas o 8 MiB, se devuelve `422` sin adjunto. El SQL calcula primero el tamaño acumulado de los comentarios almacenados. Si ese tamaño excede el límite, los textos completos no se devuelven al proceso. El serializador también mide los bytes UTF-8 del archivo final, incluidos BOM, encabezado, escape y prefijos, antes de enviar la respuesta.
- La cuota de diez solicitudes por minuto y usuario se aplica después de verificar la sesión y antes de consultar el rol. El almacén en memoria elimina los contadores vencidos al rotar sus ventanas. La cuota es por instancia y no equivale a una cuota global.

## Comentarios exportados como texto

El CSV usa UTF-8 con BOM, comas, comillas dobles para campos de texto y finales de registro CRLF. Los comentarios con iniciadores de fórmula, incluidas variantes Unicode, o con prefijos de control o formato reciben la marca visible `[texto] `. La detección también contempla espacios y apóstrofos iniciales que un importador podría interpretar de forma especial. La marca se conserva como parte del valor exportado. El comentario almacenado en la base queda intacto.

La prueba automatizada analiza el CSV, vuelve a guardar sus celdas con punto y coma y las analiza de nuevo. Queda pendiente la verificación en Excel de escritorio:

1. Descargar un reporte sintético con comentarios que tengan iniciadores de fórmula, espacios, tabulaciones, saltos de línea, caracteres de formato invisibles, comas, punto y coma, comillas y tildes.
2. Abrir el CSV en Excel y confirmar que la primera fila muestra las cuatro columnas. Si la configuración regional no detecta la coma, importar con **Datos → Desde texto/CSV** y seleccionar UTF-8 y coma.
3. Confirmar que los comentarios de prueba se muestran como texto con la marca visible, no son fórmulas y conservan sus límites de celda.
4. Guardar una copia como CSV UTF-8 y reabrirla en Excel. Repetir la comprobación y registrar versión, configuración regional, método de importación y resultado.
