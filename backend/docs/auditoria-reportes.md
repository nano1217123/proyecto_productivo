# DAT-15 · Auditoría de reportes

La auditoría cubre los 14 endpoints CSV y PDF de reseñas, progreso, rutinas,
ejercicios y membresías. Se inicia después de autenticar al actor y antes de
validar cuota, rol y filtros. Los rechazos de solicitudes anónimas no tienen
actor verificable y quedan fuera de esta tabla.

Cada evento guarda un UUID, el UUID de solicitud generado en el servidor,
el UUID del actor autenticado, tipo, formato, alcance autorizado, sede cuando
corresponde, instante y resultado técnico. El alcance se registra únicamente
cuando la autorización y generación han terminado. Se omiten credenciales,
datos físicos, nombres, correos, filtros, cuerpos y contenido de archivos.

| Evento | Qué acredita |
| --- | --- |
| `archivo_generado` | El archivo se completó y pasó los límites. La inserción es obligatoria antes del adjunto. |
| `respuesta_finalizada` | El servidor emitió `finish` para una respuesta exitosa. HEAD o 304 quedan como `sin_cuerpo`. |
| `respuesta_interrumpida` | El transporte se cerró antes de completar la respuesta. |
| `solicitud_rechazada` | El servidor terminó con 4xx, incluido rechazo por cuota, autorización o datos no procesables. |
| `error_generacion` | Terminó con un fallo interno o de persistencia obligatoria. |

Si falla la persistencia obligatoria, se devuelve 503 sin adjunto. El evento
terminal se intenta persistir cuando ya se conoce el resultado HTTP. Si falla,
se registra un código técnico y el UUID de correlación. Un reinicio del proceso
o un fallo de almacenamiento puede impedir ese último registro. Una generación
sin evento terminal deja la entrega indeterminada. Finalizar una respuesta
acredita que se entregó al transporte del servidor. El navegador puede
cancelarla o decidir dónde guardarla sin confirmación al backend.

Se guarda como máximo un evento de generación y uno terminal por solicitud.
La aplicación decide el evento terminal una sola vez y PostgreSQL rechaza
duplicados con la clave única solicitud/evento. Los índices por hora y por
actor/hora permiten revisar crecimiento y detectar correlaciones incompletas.
Las cuotas existentes siguen vigentes. La retención y el acceso operativo
quedan pendientes de definición. El UUID del actor queda como identificador
opaco si se elimina la cuenta, sin FK ni cascada.

La migración aditiva crea la tabla, restricciones, índices y un trigger que
bloquea UPDATE, DELETE y TRUNCATE. El rol de aplicación debe recibir solo
permisos de inserción y carecer de privilegios DDL sobre la tabla. El trigger
no protege de un propietario con capacidad para alterar el esquema.
La migración debe aplicarse y verificarse antes de desplegar el nuevo código:
si la tabla falta, las descargas autorizadas responden 503. Los endpoints de
lectura que no son descargas continúan independientes de DAT-15.
