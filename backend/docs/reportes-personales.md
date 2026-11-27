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
métrica y funciona sin `dia_local`. Un período vacío devuelve un archivo válido.

Cuota de diez solicitudes por minuto y titular por instancia. CSV admite 5.000
filas y 8 MiB. PDF admite 500 filas, 1 MiB de texto, 100 páginas y 4 MiB, con
hasta dos generaciones concurrentes por instancia. Los campos de texto con más
de 4 KiB se rechazan con 422, igual que los reportes que superan los demás
límites de contenido. Los CSV usan BOM y neutralizan fórmulas. El PDF representa
como códigos Unicode los caracteres fuera de la cobertura de la fuente.

La implementación interpreta ALC-07, RF-014, HU-019 y RN-013 como reportes del
titular sobre los datos ya registrados. El texto de esos requisitos debe
cotejarse con el documento funcional del equipo. No se requieren migraciones.
