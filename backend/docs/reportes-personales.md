# Reportes personales de entrenamiento

Desde **Historial de entrenamientos → Descargar mis reportes**, el titular puede
exportar CSV o PDF. El backend obtiene su identidad de la sesión y filtra por
propietario, también si la sesión pertenece a un administrador. Los reportes
excluyen nutrición, hidratación, identificadores de usuarios y notas libres.

| GET bajo `/api/reportes/personales` | Datos |
| --- | --- |
| `/progreso.csv` y `/progreso.pdf` | Fecha local, peso corporal y entrenamiento completado. |
| `/rutinas.csv` y `/rutinas.pdf` | Fecha de creación, nombre, día y ejercicios en orden. Incluye rutinas sin ejercicios. |
| `/ejercicios.csv` y `/ejercicios.pdf` | Fecha de sesión, ejercicio, número de serie, repeticiones y peso registrado. |

`desde` y `hasta` son fechas ISO opcionales e inclusivas. Para marcas de tiempo
se aplica America/Bogota. La fecha de entrenamiento ya es una fecha calendario.
Las rutinas se filtran por creación. El progreso usa la fecha histórica de cada
métrica y funciona sin `dia_local`. Si no hay registros para el período, tanto
CSV como PDF responden `422` con un mensaje explicativo y sin adjunto.

El historial incluye una vista previa interactiva con Recharts. Muestra el peso
máximo por día del ejercicio seleccionado. Es una vista del progreso de carga
del entrenamiento. El archivo de progreso físico exporta las métricas corporales
del rango elegido en el formulario de descarga.

Cuota de diez solicitudes por minuto y titular por instancia. CSV admite 5.000
filas y 8 MiB. PDF admite 500 filas, 1 MiB de texto, 100 páginas y 4 MiB, con
hasta dos generaciones concurrentes por instancia. Los campos de texto con más
de 4 KiB se rechazan con 422 y un mensaje específico. PostgreSQL comprueba la
cantidad de filas y el total de bytes de texto antes de enviar las celdas. El
servicio comprueba además los límites del archivo serializado. Los CSV usan
BOM y neutralizan fórmulas. El PDF representa
como códigos Unicode los caracteres fuera de la cobertura de la fuente.

El alcance de este módulo es el reporte personal sobre datos ya registrados.
La exportación de membresías de ALC-07 y el registro durable de DAT-15 quedan
pendientes. El flujo personal actual no requiere migraciones.
