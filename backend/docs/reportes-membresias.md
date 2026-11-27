# Reportes de membresías por sede

El Centro de reportes ofrece CSV y PDF de vínculos actuales. Los endpoints
son `GET /api/reportes/membresias/sede/:slug.csv`, su equivalente `.pdf` y
`GET /api/reportes/membresias/consolidado.csv` y `.pdf`.

El administrador solo puede consultar sedes de su asignación vigente en
`admin_sedes`. La asignación y los datos se verifican en una sola sentencia
parametrizada. El superadministrador puede consultar por sede y consolidar el
catálogo oficial. Los demás roles no tienen acceso.

Cada vínculo de `miembros_sede` identifica al titular, su sede y su fecha de
vinculación. Se exporta el nombre del titular desde `usuarios`, junto con sede,
fecha y estado «vínculo actual». Se excluyen correos, identificadores, datos
físicos y pagos. El intervalo opcional `desde`–`hasta` es inclusivo en
America/Bogota y filtra la fecha de vinculación de los vínculos que aún existen.
El CSV expresa esa fecha en UTC. El PDF muestra conteos totales y por sede.
En los archivos vacíos queda una indicación explícita por sede.

Los conteos reflejan la pertenencia actual y, con filtros, la parte del padrón
actual vinculada en ese período. La desvinculación elimina la relación.
`auditoria_roles` registra acciones específicas de vinculación y
desvinculación, pero esos eventos no constituyen un historial completo de
vigencia: una promoción o eliminación también puede retirar la relación.
Quedan fuera las bajas e indicadores históricos completos, vencimientos,
planes y cobros de alumnos. `pagos_intentos` registra intentos de pago SaaS
de J&JGym y no acredita la membresía de un alumno.

Cuota compartida entre los cuatro endpoints: diez solicitudes por usuario
y minuto por instancia. CSV: hasta 5.000 vínculos y 8 MiB. PDF: hasta 500
vínculos, 1 MiB de texto, 100 páginas y 4 MiB de salida. Se acotan los nombres
a 4 KiB por registro antes de transferir el contenido. Los excesos devuelven
`422` sin adjunto. Los archivos usan caché privada sin almacenamiento y el
CSV escapa las celdas y neutraliza fórmulas. No se requiere una migración nueva.
