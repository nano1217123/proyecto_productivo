# Desarrollo local contra Neon de ensayo

El archivo ignorado `backend/.env.ensayo-path.local` contiene una sola ruta
absoluta al archivo de configuración de ensayo existente. No contiene URLs
de conexión, tokens ni contraseñas. Cada integrante conserva su ruta local.
El lanzador y sus pruebas sí se comparten mediante Git.

En dos terminales Git Bash, ejecutar `npm run dev` desde `backend` y
`frontend`. Con la referencia presente, Express escucha en
`http://127.0.0.1:4000` y Next.js usa Webpack en `http://127.0.0.1:3000`.
El backend verifica el endpoint y la identidad de ambas conexiones mediante
transacciones de solo lectura antes de escuchar. El modo diario se fuerza a
`false` solo en ese proceso. La lectura anónima de `/api/perfil` vía Next.js
debe devolver 401.

Si los puertos están ocupados, cerrar los servidores propios desde su terminal.
Para una prueba aislada se pueden establecer los mismos valores de
`JJGYM_DEV_API_PORT` y `JJGYM_DEV_WEB_PORT` en ambas terminales.
Next.js admite una sola instancia de desarrollo por directorio.

Sin la referencia, cada lanzador conserva el modo de desarrollo anterior.
En esta estación, ese modo del backend lee la configuración habitual, que
apunta a development. Mantener la referencia para trabajar en ensayo.
Los scripts de producción permanecen independientes de la referencia.

## Recuperación de contraseña

El lanzador habitual de ensayo deja vacía `RESEND_API_KEY`. Este modo no envía
correos de recuperación. La respuesta HTTP sigue siendo genérica para
proteger la existencia de las cuentas. El registro de recuperación indica
solo si el envío está desactivado, si el proveedor aceptó o rechazó la
solicitud, o si hubo un error de transporte. No registra datos del destinatario,
enlaces, tokens ni el cuerpo devuelto por el proveedor.

### Prueba de correo controlada (propuesta)

Un futuro comando separado requerirá autorización explícita para un ensayo
concreto, verificación del endpoint y Branch ID de ensayo, una credencial
dedicada de Resend obtenida de un gestor de secretos y un remitente de un
dominio verificado. Antes de habilitar el envío, deberá validar una lista
explícita de destinatarios QA permitidos y una URL de retorno de ensayo.
Cualquier requisito ausente cancelará el arranque. El proceso tendrá una
vigencia acotada y conservará la respuesta genérica. Una aceptación de
Resend confirma recepción por el proveedor. La entrega al buzón deberá
verificarse por separado. Esta opción aún no está implementada ni habilitada.
