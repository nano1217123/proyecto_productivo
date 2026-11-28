# Mis rutinas

## Diagnóstico

J&J GYM usa Next.js con App Router y React en el frontend. La API usa Express, TypeScript, cookies HTTP-only con JWT y PostgreSQL mediante Prisma. La implementación inicial guardaba el nombre, una etiqueta libre y una lista ordenada de ejercicios con un plan básico. El repositorio filtraba por propietario. La consulta de una rutina inexistente fallaba por una importación ausente de `AppError`. Las rutas del frontend convertían los identificadores UUID a números, lo que impedía cargar el detalle y la edición. Las referencias inválidas al catálogo podían terminar como errores genéricos de base de datos.

El catálogo dispone de grupo muscular, músculo principal, equipo, imagen y enlace de video. Carece de campos estructurados para músculos secundarios y tipo de ejercicio. El editor reutiliza el tipo sugerido del registro de entrenamiento y permite ajustarlo. El entrenamiento ya persistía su contenido en una sesión independiente y protegía la unicidad de la sesión activa por usuario.

## Implementación

- `/dashboard/rutinas` ofrece búsqueda, orden, recuento, tarjetas, acceso a archivadas y una semana editable a través de los días del formulario. La asignación acepta varias rutinas por día y varios días por rutina.
- `/dashboard/rutinas/nueva` y `/dashboard/rutinas/[id]/editar` comparten un formulario por secciones. Incluye catálogo paginado, filtros, sustitución, controles de orden, configuración por tipo y resumen.
- `/dashboard/rutinas/[id]` muestra el plan. La copia se prepara con `?copia=ID` y se crea con el POST habitual al guardar. Desde el resumen de una sesión finalizada, `?entrenamiento=ID` precarga el editor con sus series completadas.
- La estimación usa tres segundos por repetición, el extremo superior de un rango cuando existe, los descansos entre series y treinta segundos de transición entre ejercicios. Si falta una medida de ejecución, se omite la estimación.
- Al iniciar se copian los objetivos, el descanso, las notas y el orden desde el servidor. Las series reales empiezan pendientes y el objetivo aparece junto al ejercicio. Las acciones del registro de entrenamiento siguen disponibles.
- El esquema añade descripción, objetivo, notas, días, archivado y fecha de modificación a `rutinas`. Añade rango máximo, peso, asistencia, duración, distancia y notas a `rutina_ejercicios`. Mantiene el orden único y las relaciones existentes. El listado usa un índice por propietario y estado.
- El borrado elimina la rutina y sus filas de planificación por cascada. Los entrenamientos y las series históricas dependen de sus propias entidades. El borrado tampoco alcanza al ejercicio de catálogo.
- La API toma el propietario de la sesión autenticada. El catálogo se comprueba en la transacción de escritura. La creación admite una clave de reintento UUID y la sesión usa su identificador y el índice único de sesión activa. Los campos administrados por el servidor se derivan fuera del cuerpo de la petición.

## API

Todas las rutas usan la sesión autenticada.

| Método y ruta | Resultado |
| --- | --- |
| `GET /api/rutinas` | Rutinas activas del titular. |
| `GET /api/rutinas?estado=archivadas` | Rutinas archivadas del titular. |
| `GET /api/rutinas/:id` | Detalle con ejercicios ordenados. |
| `POST /api/rutinas` | Crea una rutina. Acepta la misma operación para una copia editada. |
| `PUT /api/rutinas/:id` | Actualiza metadatos y orden en una sola transacción. |
| `PATCH /api/rutinas/:id/estado` | Archiva o restaura con `{ "archivada": true }` o `false`. |
| `POST /api/rutinas/:id/iniciar` | Crea una sesión desde una rutina activa. El cuerpo lleva `{ "id": "UUID" }`. |
| `DELETE /api/rutinas/:id` | Elimina la plantilla del titular. |

Las validaciones devuelven 400 para valores inválidos, 401 para falta de sesión, 404 para una rutina ausente o ajena y 409 cuando el estado impide iniciar. El formato anterior de escritura sigue aceptado. El editor admite hasta 30 ejercicios y 200 series, los límites del registro. Una plantilla antigua por encima del límite debe reducirse antes de usarla para iniciar una sesión. El guardado desde una sesión está disponible en el resumen de sesiones con el formato estructurado actual.

## Archivos

- **Nuevos en backend** · `prisma/migrations/20261128110000_routines_redesign/migration.sql`, `src/service/rutinaSesion.ts` y esta guía.
- **Actualizados en backend** · `prisma/schema.prisma`, rutas, controlador, servicio, repositorio, tipos y validador de rutinas, repositorio y validador de sesiones, y `tests/entrenamientos.integration.ts`.
- **Nuevos en frontend** · `src/features/routines/components/RoutineExercise.jsx`, `hooks/useRoutineActions.js`, `routineModel.js` y `views/routines.css` dentro de la misma funcionalidad.
- **Actualizados en frontend** · Rutas de nueva rutina, detalle y edición, API, tarjeta, selector, hook de formulario y las tres vistas de rutinas, más `TrainingPage.jsx`, `TrainingExerciseCard.jsx`, `trainingSessionModel.js` y `tests/training_browser.py`.

## Ejecución y verificación

Configura los entornos según el README, con una base de desarrollo en `DIRECT_URL` y `DATABASE_URL`. Desde la raíz:

```bash
cd backend
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
npm run typecheck
npm run build
npm run dev
```

En otra terminal, ejecuta `npm run dev` en `frontend`. Abre `/dashboard/rutinas` desde una sesión autenticada. Crea una rutina con dos tipos de ejercicio, cambia el orden y los días, prepara una copia e inicia una sesión. Comprueba que las medidas objetivo y las medidas realizadas se muestran por separado.

La integración HTTP requiere PostgreSQL local con las migraciones aplicadas y una base de pruebas llamada `jjgym_training_test`. Define `JJGYM_TRAINING_TEST_DATABASE` con su URL de loopback y ejecuta desde `backend`:

```bash
node --experimental-test-module-mocks --import tsx --test tests/entrenamientos.integration.ts tests/*.test.ts
```

La prueba de navegador usa Firefox, geckodriver y una API local simulada. En `frontend`, compila con `BACKEND_URL=http://127.0.0.1:19444 npm run build` y ejecuta `python3 tests/training_browser.py`. Si los ejecutables instalados son lanzadores, define `FIREFOX_BIN` y `GECKODRIVER_BIN` con los binarios directos.
