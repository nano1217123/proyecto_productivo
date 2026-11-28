# Registro de entrenamiento

## Ejecutar

1. Configura el frontend y el backend según el README. Usa una base aislada con el catálogo de ejercicios cargado si vas a probar el selector.
2. En `backend`, comprueba que `DIRECT_URL` identifica la base aislada. Ejecuta `npx prisma migrate deploy --config prisma7.config.ts` y `npx prisma generate --config prisma7.config.ts`.
3. Arranca el frontend y el backend con sus scripts `npm run dev`. Entra con una cuenta del gimnasio y abre `/dashboard/entrenamientos`. El historial está en `/dashboard/entrenamientos/historial`.
4. Inicia una sesión, completa una serie y recarga. Comprueba que «Continuar» vuelve a mostrar la serie. Con una sesión abierta, interrumpe temporalmente la conexión y edita una nota. Restablece la conexión y verifica que el estado pasa a «Sincronizado». Finaliza con una serie pendiente y comprueba que solo se guarda la completada.

## Persistencia y compatibilidad

- `20261128090000_training_session` añade el estado, los tiempos, la revisión y el contenido de la sesión a `entrenamientos`. El índice parcial permite una sesión activa por cuenta. Las sesiones existentes quedan finalizadas y muestran duración desconocida.
- La revisión evita que una escritura obsoleta sobrescriba otra pestaña. El navegador conserva temporalmente los cambios pendientes por cuenta y vuelve a intentar su sincronización tras recuperar la conexión. La interfaz exige una sesión autenticada para reabrir el panel incluso si hay una copia local. Tras un conflicto, el usuario puede cargar la versión del servidor previa confirmación.
- Un cierre finaliza la misma fila y materializa las series completadas en `series_entrenamiento` dentro de una transacción. Los reintentos del mismo cierre devuelven la sesión existente. Cancelar borra el contenido del borrador y conserva su estado terminal para responder a reintentos.
- `20261128100000_routine_training_plan` añade configuración opcional de tipo, series, repeticiones y descanso a `rutina_ejercicios`. Una rutina anterior usa una serie editable y 60 segundos de descanso hasta que se configure. Las sesiones guardan una copia y conservan sus datos aunque se edite o elimine la rutina.
- En una base compartida, revisa el estado de migraciones en una copia aislada y coordina la aplicación con el despliegue del backend. Ambas migraciones conservan las filas existentes.

## Medidas y fechas

| Registro | Convención |
| --- | --- |
| Fuerza | Peso externo en kg. Con dos mancuernas usadas simultáneamente, registra la suma. |
| Peso corporal | Repeticiones. |
| Carga adicional | Solo el peso añadido al cuerpo, en kg. |
| Asistencia | Ayuda aplicada en kg. |
| Isométrico y estiramiento | Segundos por serie. |
| Cardio | Segundos y, cuando se registra, kilómetros. |
| Movilidad | Segundos o repeticiones por serie. |

El volumen general suma peso externo por repeticiones de las series completadas de fuerza. Los registros históricos con peso se interpretan como fuerza porque su esquema carecía de tipo. El gráfico de fuerza usa peso máximo y repeticiones máximas diarias como medidas independientes. Los récords de carga adicional se comparan con su propio tipo. El catálogo ofrece sugerencias de tipo por nombre y equipo y se pueden corregir en la sesión. La semana empieza el lunes en hora de Bogotá. La fecha y la hora de inicio confirmadas se fijan cuando el servidor crea el borrador.

## Endpoints

Las rutas usan la cookie de acceso para obtener la identidad del usuario.

| Método y ruta | Operación |
| --- | --- |
| `GET /api/entrenamientos/activa` | Buscar una sesión en curso. |
| `POST /api/entrenamientos/activa` | Iniciar con un UUID de operación y contenido validado. |
| `PUT /api/entrenamientos/activa/:id` | Guardar contenido si coincide la revisión. |
| `POST /api/entrenamientos/activa/:id/finalizar` | Finalizar de forma idempotente con la revisión confirmada. |
| `POST /api/entrenamientos/activa/:id/cancelar` | Cancelar de forma idempotente. |
| `GET /api/entrenamientos` | Listar sesiones finalizadas con sus medidas. |
| `PATCH /api/entrenamientos/:id` | Corregir el nombre y las notas. |
| `DELETE /api/entrenamientos/:id` | Eliminar un entrenamiento finalizado. |
| `GET /api/entrenamientos/ejercicio/:ejercicioId/progreso` | Consultar medidas diarias de fuerza del titular. |
| `GET /api/rutinas/:id`, `POST /api/rutinas`, `PUT /api/rutinas/:id` | Consultar y persistir la planificación opcional. |
| `GET /api/ejercicios` | Incluye el video de demostración cuando existe. |

El endpoint heredado `POST /api/entrenamientos` sigue aceptando sesiones de peso y repeticiones. El nuevo flujo de registro utiliza las rutas de sesión activa.

## Pruebas

Para repetir la integración, crea una base PostgreSQL desechable llamada `jjgym_training_test` en `127.0.0.1`, aplica todas las migraciones y apunta `JJGYM_TRAINING_TEST_DATABASE` a ella con `sslmode=disable`. El escenario crea cuentas y ejercicios de prueba y los limpia al terminar.

```sh
# Desde backend
npm run typecheck
npm run build
node --experimental-test-module-mocks --import tsx --test tests/*.test.ts tests/entrenamientos.integration.ts

# Desde frontend
node --experimental-test-module-mocks --import ../backend/node_modules/tsx/dist/loader.mjs --test $(rg --files src -g '*.test.mjs')
BACKEND_URL=http://127.0.0.1:19444 VERCEL=1 npm run build
python3 tests/training_browser.py
```

La prueba del navegador requiere Firefox y geckodriver. Configura `FIREFOX_BIN` y `GECKODRIVER_BIN` si los ejecutables no están en el PATH. Usa un servidor HTTP de prueba para simular un error temporal de sincronización y requiere que los puertos locales 19444–19446 estén libres. La persistencia de PostgreSQL se verifica por separado con la prueba de integración HTTP.
