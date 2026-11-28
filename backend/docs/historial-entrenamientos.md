# Historial de entrenamientos

## Diagnóstico y alcance

El registro activo guardaba el orden, el descanso, las notas y las mediciones en `entrenamientos.sesion`. Al finalizar, también escribía las series completadas de manera transaccional para alimentar los reportes y el progreso por ejercicio. El historial anterior descargaba todas las sesiones con sus series y compartía pantalla con el gráfico de progreso. Su corrección se limitaba al nombre y las notas. Importar una sesión al editor de rutinas también descargaba la colección completa.

El historial usa las sesiones finalizadas del usuario. La consulta de listado agrega medidas en PostgreSQL y el detalle recupera el contenido de una sola sesión. El módulo de registro sigue administrando sesiones activas, Mis rutinas conserva su editor y su API de alta y el gráfico de evolución conserva su servicio de progreso. El historial no escribe datos nutricionales.

La captura visual `historial.jpg` guio el fondo oscuro, los acentos verdes, las fechas destacadas, los indicadores y la distribución de las tarjetas. El detalle usa imágenes del catálogo y barras de series por grupo, cuando hay datos.

## Rutas

Abre `/dashboard/entrenamientos/historial` desde el tablero. Desde allí puedes volver al registro, abrir `/dashboard/entrenamientos/progreso` o acceder al formulario de Mis rutinas mediante «Guardar como rutina».

Los endpoints requieren la cookie autenticada. Las rutas son relativas a `/api/entrenamientos`.

| Método y ruta | Operación |
| --- | --- |
| `GET /historial` | Lista de 20 tarjetas por página. Admite `pagina`, `buscar`, `desde`, `hasta`, `rutina`, `grupo`, `ejercicio`, `duracion` en minutos, `records=true` y `orden`. Devuelve `entrenamientos` y `siguiente`. |
| `GET /actividad` | Resumen, grupos principales y conteo por día. Recibe fechas civiles `semana`, `mes`, `hoy`, `desde` y `hasta`. El rango de calendario admite hasta 32 días. |
| `GET /:id` | Detalle ordenado, catálogo histórico, información de origen y mejoras de carga. |
| `GET /comparar` | Recibe `anterior` y `reciente`, dos identificadores distintos del titular. |
| `PATCH /:id` | Admite la corrección previa de nombre y notas, o `{ revision, fecha, contenido }` con las validaciones del registro. |
| `DELETE /:id` | Elimina la sesión finalizada del titular y sus series por cascada. |
| `POST /:id/repetir` | Recibe `{ id }` con el UUID de solicitud y crea una sesión activa de series pendientes. |

El editor de rutinas consulta el detalle y usa el alta existente de `/api/rutinas`. El formulario permite descartar las cargas importadas y editar el plan antes de crear la rutina.

## Persistencia, métricas y seguridad

La migración `20261130100000_training_history` añade tres columnas opcionales a `entrenamientos`. `rutina_origen` guarda el identificador y nombre de la rutina al iniciar. `catalogo_historico` conserva una copia acotada de los datos de presentación al finalizar. `actualizado_en` registra la última corrección, separada de la fecha de creación. Las sesiones antiguas pueden usar el catálogo actual y reconstruir su detalle desde las filas de series. No se intenta inferir la rutina de origen de sesiones anteriores.

El calendario usa la fecha civil de `America/Bogota` que registra el flujo de entrenamiento actual. Se conserva esa fecha al mostrar sesiones antiguas y usuarios que abren el navegador en otra zona. Los horarios de inicio y fin se muestran en la misma zona. La fecha corregida es la fecha de la bitácora y los instantes originales de ejecución se conservan.

El volumen suma kg registrados por repeticiones completadas en fuerza y carga adicional. El registro indica sumar ambas mancuernas cuando se usan a la vez. Los datos anteriores sin convención explícita se muestran como carga registrada, sin aplicar multiplicadores ni inferir lado. El editor permite introducir libras y convierte a kg antes de guardar. El volumen total de comparación exige los mismos ejercicios y tipos con una sola clase de carga compatible. Duraciones o distancias ausentes se mantienen como datos desconocidos.

Una mejora de carga exige superar el máximo de una sesión anterior para el mismo ejercicio y tipo. La primera marca establece la referencia. Los máximos se derivan de las series vigentes, por lo que corregir o borrar una sesión cambia las mejoras posteriores. El porcentaje de comparación divide el cambio por el valor de referencia solo si existe una base distinta de cero.

Las consultas autentican al titular y limitan el acceso a sesiones finalizadas. La corrección de contenido usa una revisión para detectar escrituras concurrentes y actualiza la sesión y su proyección de series en una transacción. La eliminación definitiva usa la relación en cascada de series y evita referencias huérfanas. La sesión activa usa el índice único existente por usuario, además del UUID de solicitud en los reintentos. El listado usa los índices existentes y limita las sesiones antes de agregar sus tarjetas en los órdenes por fecha y duración. El orden por volumen y el filtro de récords requieren calcular sus valores sobre las candidatas.

## Ejecutar y verificar

Configura los entornos de desarrollo según el README. Con `DIRECT_URL` apuntando a una base local de desarrollo, ejecuta desde `backend`:

```sh
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
npm run dev
```

En otra terminal, desde `frontend`, ejecuta `npm run dev`. Inicia sesión, finaliza un entrenamiento y verifica que aparezca en la lista y el calendario. Abre el detalle, repite la sesión y comprueba que las series están pendientes. Luego importa otra sesión al editor de rutinas y verifica que modificar la plantilla no cambie su historial.

### Pruebas

Desde `backend`, usa una base PostgreSQL descartable en `127.0.0.1`, llamada `jjgym_training_test`, con las migraciones aplicadas:

```sh
npm run typecheck
npm run build
JJGYM_TRAINING_TEST_DATABASE=postgresql://postgres@127.0.0.1:19457/jjgym_training_test \
  node --experimental-test-module-mocks --import tsx --test tests/*.test.ts tests/entrenamientos.integration.ts
```

Desde `frontend`:

```sh
node --experimental-test-module-mocks --import ../backend/node_modules/tsx/dist/loader.mjs --test $(rg --files src -g '*.test.mjs')
BACKEND_URL=http://127.0.0.1:19444 npm run build
python3 tests/training_browser.py
```

La prueba del navegador usa Firefox y geckodriver. Permite configurar `FIREFOX_BIN` y `GECKODRIVER_BIN`, e inicia un servidor HTTP simulado para los flujos de interfaz. La integración del backend usa PostgreSQL real, incluyendo aislamiento entre usuarios, repetición concurrente y paginación con 1.012 sesiones.

## Inventario de cambios

| Área | Archivos creados | Archivos modificados |
| --- | --- | --- |
| Persistencia | `prisma/migrations/20261130100000_training_history/migration.sql`, `repositories/historial.repository.ts`, `repositories/trainingHistoryData.ts` | `prisma/schema.prisma`, `repositories/sesionEntrenamiento.repository.ts`, `repositories/entrenamientos.repository.ts` |
| API y dominio | `controller/historial.controller.ts`, `service/compararEntrenamientos.ts`, `service/volumenEntrenamiento.ts` | `controller/entrenamientos.controller.ts`, `controller/rutinas.controller.ts`, `routes/entrenamientos.routes.ts` |
| Historial y progreso | `api/historyApi.js`, `components/HistoryCalendar.jsx`, `HistoryComparison.jsx`, `HistoryDetail.jsx`, `HistoryEditor.jsx`, `HistoryList.jsx`, `hooks/historyDates.js`, `trainingUnits.js`, `useHistoryRequest.js`, `views/TrainingProgressPage.jsx`, `views/history.css`, `app/dashboard/entrenamientos/progreso/page.jsx` | `views/TrainingHistoryPage.jsx`, `views/TrainingPage.jsx`, `components/ReportesPersonales.jsx`, `hooks/trainingSessionModel.js` |
| Rutinas | — | `hooks/useRoutineForm.js`, `views/RoutineFormPage.jsx` |
| Pruebas | `backend/tests/historial.test.ts`, `hooks/historyDates.test.mjs` | `backend/tests/entrenamientos.integration.ts`, `frontend/tests/training_browser.py`, `hooks/trainingSessionModel.test.mjs` |
| Documentación | `backend/docs/historial-entrenamientos.md` | — |

Las rutas abreviadas del backend son relativas a `backend/src` salvo `prisma`, que es relativa a `backend`. Las rutas de historial y pruebas frontend son relativas a `frontend/src/features/training` salvo `app`, que es relativa a `frontend/src`. Las rutas de rutinas son relativas a `frontend/src/features/routines`. No se eliminaron archivos.

## Límites

- La zona de entrenamiento sigue la convención de Bogotá del sistema. El historial carece de un selector de zona por usuario.
- Las primeras cargas se muestran como referencias. Los récords del historial corresponden a mejoras de carga máxima. Las distancias, duraciones y repeticiones a una carga se comparan entre sesiones, sin una clasificación de récords para esas métricas.
- El catálogo identifica un grupo principal por ejercicio. Se muestra la distribución de series por ese grupo.
- El registro no guarda una convención por serie para mancuernas o movimientos unilaterales. El volumen y la comparación usan el peso registrado según la convención de carga del registro. Una sesión anterior que siguió una convención distinta requiere revisión por parte del titular.
- Las correcciones mantienen fecha de creación y última modificación. Un registro de auditoría con el antes y el después no forma parte de esta implementación.
- El registro activo conserva el endpoint previo de referencias históricas. La nueva pantalla de historial y la importación a rutinas usan las consultas acotadas.

### Resultados de esta entrega

- PostgreSQL 18 local aplicó las 16 migraciones en las bases de prueba de entrenamiento y nutrición.
- La suite de backend registró 59 pruebas aprobadas, incluidas las tres integraciones de entrenamiento y rutinas. La integración existente de nutrición también pasó por separado.
- La suite frontend registró 10 archivos de pruebas aprobados. Firefox verificó el flujo del historial con un viewport de 380 px y en escritorio, con API HTTP simulada. Se comprobaron el historial vacío, los filtros, la navegación por meses, el detalle, la edición, la confirmación y eliminación, el reintento tras un 503, la repetición y la importación a rutinas.
- La verificación de tipos de backend, ambas compilaciones y `git diff --check` pasaron. Los manifiestos no definen un script de lint.
- Las dos suites de integración de métricas que requieren acceso a Docker quedaron pendientes por permisos del socket.
