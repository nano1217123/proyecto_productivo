# Inicio personal de J&J GYM

## Diagnóstico

Inicio mostraba enlaces equivalentes para registrar, consultar rutinas y abrir el historial. «Herramientas» agrupaba módulos independientes. La actividad y las sesiones pendientes solo se podían consultar al entrar a otros módulos. El seguimiento diario y la tarjeta de pagos ocupaban espacio sin resumir el rendimiento deportivo.

La aplicación utiliza Next.js App Router y React en el frontend, con Express, TypeScript y Prisma sobre PostgreSQL en la API. El perfil autenticado identifica cuatro roles. `cliente` y `usuario_particular` usan Inicio personal. `admin` y `super_admin` tienen su propia vista en la misma ruta. La sesión se valida mediante cookies y la API deriva la identidad de la solicitud autenticada.

El inventario incluye sesiones activas con revisión y recuperación local, historial de sesiones finalizadas, rutinas con días de la semana, catálogo con filtro de casa, perfiles y registros nutricionales, reportes personales y administrativos, pagos Wompi y vínculos a sedes. El perfil disponible carece de foto, zona horaria general y notificaciones. Los vínculos a sedes carecen de plan, estado y vigencia. Los intentos Wompi registran el resultado del pago.

## Interfaz y comportamiento

`inicio.jpg` sirvió de referencia para la jerarquía, las superficies oscuras y el tamaño de los bloques. Inicio usa el violeta del sistema. La navegación se comparte con los demás módulos. La composición es vertical en móvil y tablet en orientación estrecha. Desde 820 px dispone el entrenamiento, la semana, los módulos y la última sesión a la izquierda, con nutrición, progreso y afiliación a la derecha.

El estado de la sesión activa tiene prioridad. Le siguen una sesión completada hoy y la planificación de hoy. El usuario puede cambiar de rutina cuando hay varias candidatas o iniciar una sesión adicional. La imagen aparece si el catálogo ya ofrece una para algún ejercicio de la rutina seleccionada. Inicio reutiliza el registro y su mecanismo de sincronización, el inicio desde rutinas y el endpoint de repetición del historial. El ID de la nueva sesión se conserva al reintentar la repetición y el servidor aplica la restricción de una sesión activa por cuenta.

La semana empieza el lunes y usa la fecha local del dispositivo. La fecha civil guardada por el registro histórico conserva su semántica en Bogotá. Los días planificados derivan de las rutinas activas actuales. La semana anterior muestra sesiones reales, ya que el sistema carece de instantáneas históricas de planificación. La gráfica muestra frecuencia registrada durante cuatro semanas. El seguimiento diario del usuario particular y los reportes detallados siguen accesibles desde Mi progreso.

La afiliación muestra la sede registrada por el gimnasio. La suscripción personal enlaza al flujo de planes y pagos. Mostrar fechas, avisos de vencimiento, estados de vigencia o un plan contratado requiere que el sistema registre esos datos como parte del negocio de suscripciones y membresías.

## Consultas

| Método y ruta | Datos |
| --- | --- |
| `GET /api/entrenamientos/resumen-inicio?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` | Última sesión mediante la proyección de historial, total personal y agregados diarios de sesiones, tiempo y series. Rango máximo de 28 días. |
| `GET /api/rutinas/planificacion` | ID, nombre y días de rutinas activas. La tarjeta consulta el detalle de la rutina seleccionada con el endpoint existente. |
| `GET /api/nutricion/resumen-inicio` | Configuración, objetivo, preferencia de seguimiento, referencia y agregado diario de proteína. La referencia procede del servicio nutricional existente. |

Las tres consultas requieren autenticación y rol personal, derivan su filtro de la sesión y responden con `Cache-Control: private, no-store`. Se ejecutan de forma independiente. Inicio mantiene sus acciones y permite reintentar los bloques con fallos parciales. Las consultas limitan la proyección y el intervalo sin descargar el historial completo ni el detalle de todas las rutinas. Este cambio no agrega dependencias ni migraciones.

## Verificación

1. Configurar y ejecutar backend y frontend con las instrucciones del README, usando una base de desarrollo o de pruebas.
2. Abrir `/dashboard` con una cuenta particular y una cuenta cliente vinculada a una sede. Probar una rutina planificada, una segunda rutina el mismo día y una sesión activa. Revisar que la semana muestre sesiones y planificación como estados distintos.
3. Abrir el detalle desde Último entrenamiento y repetir una sesión. Confirmar en el registro que las series están pendientes y que el historial conserva la sesión original.
4. Configurar Nutrición, registrar un alimento y volver a Inicio. Desactivar el seguimiento para comprobar que se ocultan el indicador y el acceso de registro.
5. Abrir Inicio con una cuenta administrativa para verificar el panel de gestión.

Comandos de validación disponibles:

- Backend: `npm run typecheck`, `npm run build` y las pruebas de `backend/tests` con `node --experimental-test-module-mocks --import tsx --test`. Los archivos `entrenamientos.integration.ts` y `nutrition.integration.ts` requieren las bases PostgreSQL locales desechables documentadas en sus respectivos módulos.
- Frontend: `npm run build`. Desde `frontend`, ejecutar `node --experimental-test-module-mocks --import ../backend/node_modules/tsx/dist/loader.mjs --test $(find src -name '*.test.mjs')`.
- Navegador: compilar con `BACKEND_URL=http://127.0.0.1:19714 npm --prefix frontend run build` y ejecutar `python3 frontend/tests/home_browser.py` desde la raíz. La prueba usa Firefox, geckodriver y respuestas sintéticas. Se pueden configurar los ejecutables con `FIREFOX_BIN` y `GECKODRIVER_BIN`.

## Archivos

### Nuevos

- `docs/inicio-dashboard.md`
- `frontend/src/features/dashboard/components/HomeActivity.jsx`
- `frontend/src/features/dashboard/components/HomePanel.jsx`
- `frontend/src/features/dashboard/components/HomeSummaries.jsx`
- `frontend/src/features/dashboard/components/HomeTraining.jsx`
- `frontend/src/features/dashboard/homeModel.js`
- `frontend/src/features/dashboard/homeModel.test.mjs`
- `frontend/src/features/dashboard/views/home.css`
- `frontend/tests/home_browser.py`

### Modificados

- `backend/src/controller/historial.controller.ts`
- `backend/src/nutrition/service.ts`
- `backend/src/repositories/historial.repository.ts`
- `backend/src/repositories/rutinas.repository.ts`
- `backend/src/routes/entrenamientos.routes.ts`
- `backend/src/routes/nutrition.routes.ts`
- `backend/src/routes/rutinas.routes.ts`
- `backend/tests/entrenamientos.integration.ts`
- `backend/tests/nutrition.integration.ts`
- `frontend/src/app/dashboard/entrenamientos/historial/page.jsx`
- `frontend/src/app/dashboard/nutricion/page.jsx`
- `frontend/src/features/dashboard/views/DashboardPage.jsx`
- `frontend/src/features/nutrition/views/NutritionPage.jsx`
- `frontend/src/features/routines/api/routinesApi.js`
- `frontend/src/features/training/api/historyApi.js`
- `frontend/src/features/training/views/TrainingHistoryPage.jsx`
- `frontend/src/features/training/views/TrainingPage.jsx`

Este trabajo conserva todos los archivos existentes y reutiliza el esquema de la base de datos.

## Resultados

- Frontend. Compilación de producción aprobada y 11 archivos de pruebas aprobados.
- Backend. Compilación y verificación de tipos aprobadas. La suite ejecutó 60 pruebas exitosas, incluidas las integraciones de entrenamiento y nutrición con bases PostgreSQL desechables. Las pruebas nuevas comprueban autenticación, aislamiento, roles, validación del rango, agregados y seguimiento desactivado.
- Firefox. El recorrido de Inicio pasó a 360, 768 y 1150 px con datos sintéticos. Incluyó acciones de inicio, reanudación, repetición, historial, error parcial, afiliación a sede y vista administrativa.
- Los recorridos existentes de Firefox para entrenamiento, historial, rutinas y nutrición también pasaron.
- Las dos integraciones históricas de métricas requieren crear contenedores específicos. El socket de Docker rechazó el acceso. No hay un comando de lint configurado en los paquetes.
