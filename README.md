# J&JGym V2.0

Plataforma web para gimnasios: registro e inicio de sesión, entrenamientos,
rutinas, catálogo de ejercicios, seguimiento del usuario particular, sedes y
roles, reseñas y pagos con Wompi (Sandbox).

Esta guía explica cómo arrancar el proyecto después de clonarlo. La
documentación técnica del backend está en [`BACKEND.md`](./BACKEND.md).

## Stack

| Parte | Tecnología |
|---|---|
| Frontend (`frontend/`) | Next.js 16 (App Router), React 19, JavaScript |
| Backend (`backend/`) | Node.js, Express 4, TypeScript (se ejecuta con `tsx` en desarrollo) |
| Base de datos | PostgreSQL en Neon, con Prisma 7 y `@prisma/adapter-neon` |
| Autenticación | Propia: JWT en cookies httpOnly y refresh tokens rotativos |

Arquitectura del backend: `routes → controller → service → repository →
Prisma`. En el frontend, las vistas llaman a la API de cada módulo
(`src/features/<módulo>/api`), que reutiliza
[`frontend/src/lib/api/httpClient.js`](./frontend/src/lib/api/httpClient.js).

## Requisitos

- **Node.js** compatible con las dependencias: Next.js 16 pide `>=20.9.0` y
  Prisma 7 pide `^20.19 || ^22.12 || >=24.0`. Los `package.json` no declaran
  `engines`; los `Dockerfile` usan Node 20.
- **npm** (los dos paquetes incluyen `package-lock.json`).
- Una **base de datos de destino conocida** para el backend (ver
  [Base de datos](#base-de-datos-qué-conecta-el-backend)).

## 1. Backend

```bash
cd backend
npm ci
cp .env.example .env      # completa .env con tus valores (no lo subas a Git)
npx prisma generate --config prisma7.config.ts       # genera el cliente en src/generated/prisma (ignorado por Git)
npm run dev               # tsx watch src/server.ts → http://localhost:4000
```

- `npx prisma generate --config prisma7.config.ts` no se conecta a la base: lee `prisma/schema.prisma`
  mediante `prisma7.config.ts`. Repítelo cuando cambie el esquema. Sin este
  paso el backend no compila ni arranca.
- Variables en [`backend/.env.example`](./backend/.env.example). El backend
  **no arranca** si falta alguna de estas: `DATABASE_URL`, `DIRECT_URL`,
  `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_REDIRECT_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y
  `CLOUDINARY_API_SECRET`.
- `PORT` vale `4000` por defecto. `CLIENT_ORIGIN` (CORS) y `FRONTEND_URL`
  valen `http://localhost:3000` por defecto; en producción `CLIENT_ORIGIN`
  es obligatorio.
- Opcionales: `RESEND_API_KEY` (correo), `RECAPTCHA_SECRET_KEY` (sin ella la
  verificación de reCAPTCHA queda desactivada) y las variables de Wompi.
  Sin las llaves de Wompi o sin `USD_COP_TASA`, el servidor arranca y los
  endpoints de pago responden 503.

Otros comandos (`backend/package.json`):

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Compila a `dist/` |
| `npm start` | Ejecuta `dist/server.js` |

El Dockerfile del backend ejecuta el servidor compilado en modo producción.
Configura sus variables en ejecución, incluido `CLIENT_ORIGIN`, y sirve el
frontend por HTTPS para que el navegador acepte las cookies seguras.

## 2. Frontend

```bash
cd frontend
npm ci
cp .env.local.example .env.local
npm run dev               # next dev → http://localhost:3000
```

Variables en [`frontend/.env.local.example`](./frontend/.env.local.example):

- **`BACKEND_URL`** (por defecto `http://localhost:4000`): destino de las
  peticiones del frontend. El navegador llama siempre a `/api/...` en el
  dominio del frontend y Next.js las reenvía a `BACKEND_URL`
  ([`next.config.js`](./frontend/next.config.js)); el
  [`proxy.js`](./frontend/src/proxy.js) lo usa también para validar la
  sesión al visitar `/login` o `/register`. El panel confirma o renueva la
  sesión a través de la API antes de mostrar el contenido. Las reescrituras se calculan al arrancar
  `next dev` o al ejecutar `next build`: si cambias la variable, reinicia o
  vuelve a compilar. `NEXT_PUBLIC_API_URL` solo se usa como respaldo
  heredado.
- **`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`**: clave pública de reCAPTCHA v3
  (ver la sección de reCAPTCHA en `BACKEND.md`).

`BACKEND_URL` solo decide a qué backend habla el frontend. **No decide qué
base de datos usa ese backend**: eso depende del `.env` del backend.

Comandos: `npm run dev`, `npm run build`, `npm start`.

Para construir el frontend en Docker, pasa `BACKEND_URL` y, si está
configurada, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` como argumentos de compilación.
Configura también `BACKEND_URL` en el contenedor en ejecución para las
comprobaciones de sesión del proxy. Los archivos de entorno locales quedan fuera
del contexto de construcción.

## Base de datos: qué conecta el backend

El backend se conecta a la base indicada en `DATABASE_URL` (consultas de la
aplicación) y Prisma CLI usa `DIRECT_URL` (migraciones y otros comandos).
Comprueba el destino de ambas antes de arrancar.

### Verificar el destino antes de arrancar

Desde `backend/`, después de completar `.env` y **antes** de `npm run dev`,
muestra el host y la base de cada URL sin imprimir usuario ni contraseña:

```bash
node -e "require('dotenv').config({ quiet: true }); for (const k of ['DATABASE_URL', 'DIRECT_URL']) { try { const u = new URL(process.env[k]); console.log(k, '->', u.host, u.pathname.slice(1)); } catch { console.log(k, '-> no definida o inválida'); } }"
```

Interpreta el resultado así:

- `127.0.0.1` o `localhost`: base local.
- Un host `ep-…neon.tech`: un endpoint de Neon. Compáralo con el endpoint que
  muestra la consola de Neon para cada rama. Si coincide con `development` o
  `production`, es una base compartida: no arranques el backend sin
  autorización del equipo.
- `no definida o inválida`: corrige `.env` (el backend tampoco arrancaría).

No compartas el contenido de `.env` ni la salida de comandos que impriman la
URL completa.

- **Neon `development` y `production` son bases compartidas del equipo.** Un
  backend cuyo `.env` apunta a ellas puede abrir conexiones y escribir en
  esos datos en cuanto recibe peticiones (registro, entrenamientos,
  pagos…). Úsalas solo con autorización del equipo.
- **Base aislada** (recomendada para desarrollar y probar): una rama de Neon
  propia o desechable, o un PostgreSQL local. El cliente usa el driver
  serverless de Neon (`@prisma/adapter-neon`); para un PostgreSQL local hace
  falta un proxy compatible con ese driver, que **no está incluido** en el
  repositorio.
- No ejecutes `npx prisma migrate dev` ni `migrate deploy` contra una base
  compartida. Las migraciones de `backend/prisma/migrations` describen el
  esquema versionado, pero no indican qué se aplicó en cada rama de Neon.

## Estado de algunos módulos

- **Pagos (Wompi, solo Sandbox):** una transacción aprobada confirma el pago
  en el backend. La suscripción SaaS por sede se activa y renueva por meses
  calendario cuando Wompi confirma el pago (ver
  `backend/docs/suscripcion-sede.md`). La vigencia de la suscripción del
  usuario particular sigue pendiente (ver `BACKEND.md`, sección 14).
- **Métricas diarias del usuario particular:** la bandera
  `PARTICULAR_METRICAS_DIARIAS` está desactivada por defecto (solo se activa
  con el valor `true`). Su expansión de esquema está documentada en
  [`backend/scripts/metricas/README.md`](./backend/scripts/metricas/README.md)
  y sus scripts no deben ejecutarse en Neon ni en otras bases compartidas.

## Herramientas personales (fuera del repositorio)

Algunos integrantes usan scripts propios en `~/.jjgym` para preparar su
entorno local. **No forman parte del repositorio** y no son necesarios para
seguir esta guía. No subas a Git sus rutas, credenciales ni URLs privadas.

## Documentación

- [`BACKEND.md`](./BACKEND.md): arquitectura, endpoints, seguridad, roles y
  sedes.
- [`backend/scripts/metricas/README.md`](./backend/scripts/metricas/README.md):
  expansión de métricas diarias.
- [`DOCUMENTACION-PROYECTO.md`](./DOCUMENTACION-PROYECTO.md) y
  [`docs/legacy/`](./docs/legacy/): **referencia histórica** de la versión
  anterior basada en Supabase. Sus instrucciones ya no aplican.

## Mi progreso

Abre **Mi progreso** en la barra del dashboard con una cuenta cliente o particular.
La ruta es `/dashboard/particular`. El panel ofrece Resumen, Seguimiento corporal y
Rendimiento deportivo. Los enlaces personales del historial y del Centro de reportes
llevan a la evolución por ejercicio. El Centro de reportes conserva las exportaciones.

### Datos y operaciones

| Ruta autenticada | Operaciones |
| --- | --- |
| `/api/perfil/altura` | `GET` y `PATCH` consultan y guardan `alturaCm`, un entero en centímetros. |
| `/api/progreso/peso` | `GET` consulta el último registro y el historial con `desde`, `pagina`, `orden` y `grafica`. `POST` recibe `pesoActualKg` e `id`, un UUID para reintentos. |
| `/api/progreso/peso/:id` | `PATCH` corrige el peso y `DELETE` elimina su valor. |
| `/api/progreso/deporte` | `GET` calcula actividad, grupos musculares, ejercicios y marcas para `desde` y `hasta`. |
| `/api/progreso/ejercicios/:id` | `GET` devuelve series completadas del ejercicio para `desde` y `hasta`. |
| `/api/nutricion/resumen-inicio` | `GET` reutiliza el resumen nutricional de Inicio y respeta la preferencia de seguimiento. |

El peso conserva el rango de 20 a 300 kg y se registra con la fecha y hora del
servidor. La interfaz acepta coma o punto decimal. La edición conserva el momento
del registro. La eliminación quita el valor corporal de la fila para conservar las
otras métricas que pueda contener y evitar que un reintento restaure el peso.
Nutrición consulta el mismo historial. Las fechas corporales se presentan en
la zona de Bogotá. La altura es opcional y se guarda en el perfil.

Las marcas de carga se comparan por ejercicio, tipo y repeticiones. La primera
marca establece la referencia y el récord exige superar el máximo previo. Los cambios
en el historial se reflejan en la siguiente consulta. La actividad agrupa las
sesiones finalizadas por semana o mes calendario. La comparación usa los días
inmediatamente anteriores de igual duración. El volumen conserva la convención
de carga registrada y distingue fuerza de carga adicional.

El historial entrega 15 pesos por página. La gráfica corporal muestra hasta
2000 registros del periodo y la consulta por ejercicio hasta 5000 series, con
un aviso al superar los límites. Las operaciones nuevas obtienen la identidad
de la sesión y las lecturas devuelven respuestas privadas sin caché.

### Verificación local

1. Configura ambos paquetes según las secciones de arranque. En una base propia
   de desarrollo, genera el cliente Prisma y aplica las migraciones versionadas.
   `20261201120000_progress_tracking` agrega dos campos opcionales y un índice.
2. Abre **Mi progreso** con una cuenta personal. Registra un peso decimal y
   completa la altura desde **Último registro**. Prueba el cambio de periodo
   y las acciones de edición y eliminación en **Seguimiento corporal**.
3. Finaliza varios entrenamientos con series comparables, consulta **Rendimiento
   deportivo** y abre el detalle de una marca. Configura Nutrición y verifica
   que el objetivo y la proteína de hoy coincidan en ambos módulos.
4. Para repetir las pruebas, usa `backend/tests/entrenamientos.integration.ts`
   con la base PostgreSQL descartable descrita en
   [Historial de entrenamientos](./backend/docs/historial-entrenamientos.md).
   Compila el frontend con `BACKEND_URL=http://127.0.0.1:19714` antes de ejecutar
   `python3 frontend/tests/home_browser.py` desde la raíz.
