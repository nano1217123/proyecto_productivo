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
