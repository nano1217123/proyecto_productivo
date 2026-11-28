# Reportes personales de entrenamiento

Desde **Centro de reportes → Mis reportes** o **Progreso por ejercicio**, el titular puede
exportar CSV o PDF. El backend obtiene su identidad de la sesión y filtra por
propietario, también si la sesión pertenece a un administrador. Los reportes
excluyen nutrición, hidratación, identificadores de usuarios y notas libres.

| GET bajo `/api/reportes/personales` | Datos |
| --- | --- |
| `/progreso.csv` y `/progreso.pdf` | Fecha local, peso corporal y entrenamiento completado. |
| `/rutinas.csv` y `/rutinas.pdf` | Fecha de creación, nombre, etiqueta histórica de día, orden y ejercicio, seguidos de días planificados y estado. Incluye rutinas propias activas, archivadas y sin ejercicios. |
| `/ejercicios.csv` y `/ejercicios.pdf` | Fecha de sesión, ejercicio, número de serie, repeticiones y peso registrado, seguidos de tipo, duración en segundos, distancia en kilómetros y asistencia en kilogramos. Solo incluye sesiones finalizadas. |

En los CSV de rutinas y ejercicios, las cinco columnas anteriores conservan
su nombre, posición y significado. Los consumidores que exigen una cantidad
fija de columnas deben aceptar las columnas añadidas al final. Las rutinas
muestran los días semanales de lunes a domingo. Si no hay días planificados,
la columna queda vacía y se conserva la etiqueta histórica en `Día`.
Ejercicios prefiere el nombre guardado en el catálogo histórico de la sesión
y usa el nombre actual cuando la captura no contiene un nombre de texto
válido. Las mediciones y el tipo ausentes se muestran como celda vacía en CSV
y como «—» en PDF. El cero registrado se conserva.

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
La exportación de membresías y el registro de auditoría están documentados
en [Reportes de membresías](reportes-membresias.md) y [DAT-15](auditoria-reportes.md).
Este ajuste no añade migraciones y utiliza las columnas de las migraciones
existentes de rutinas, series e historial.
