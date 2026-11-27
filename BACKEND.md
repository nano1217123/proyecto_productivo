# Backend — Sistema de autenticación propio

Documentación técnica del backend del proyecto. Reemplaza la
implementación anterior basada en Supabase Auth.

## 1. Resumen ejecutivo

El backend migró de **Supabase Auth** (registro, login, OTP y OAuth
gestionados por Supabase) a un **sistema de autenticación propio**
sobre:

- **Neon** (Postgres 16 serverless) como base de datos.
- **Prisma 7** con el adaptador `@prisma/adapter-neon` como ORM.
- **JWT HS256** firmados por el backend, entregados en cookies httpOnly.
- **Refresh tokens rotativos** almacenados hasheados en la base de datos.
- **bcryptjs** (12 rondas) para contraseñas y códigos OTP.
- **Resend** como proveedor de correo transaccional.

Supabase ya no participa en el proyecto. El frontend llama al backend
mediante `frontend/src/lib/api/httpClient.js`. La guía de arranque está en
[`README.md`](./README.md).

## 2. Stack

| Componente | Tecnología |
|---|---|
| Runtime | Node.js 22.20 |
| Lenguaje | TypeScript 7.0 |
| Framework HTTP | Express 4 |
| ORM | Prisma 7 + `@prisma/adapter-neon` |
| Base de datos | Neon (Postgres 16 serverless) |
| Hashing | bcryptjs (12 rondas) |
| Tokens de sesión | JWT (HS256) + refresh tokens opacos |
| Hash de refresh | SHA-256 |
| Correo | Resend API |
| Seguridad HTTP | helmet, CORS restringido, rate limiting |
| Validación | propia (validators + sanitizers) |

## 3. Arquitectura en capas

```
routes → controller → service → repository → Prisma → Neon
```

- **routes:** define los endpoints y aplica middleware en orden.
- **controller:** adapta HTTP ↔ servicio. Maneja cookies y `res`. No
  contiene lógica de negocio.
- **service:** lógica de negocio. Lanza `AppError` para errores
  esperados.
- **repository:** único punto de acceso a la base de datos. Usa
  Prisma.
- **middleware:** auth, roles, rate limiting, manejo de errores.
- **validator:** parsea y valida `req.body`. Devuelve datos limpios o
  lanza `AppError(400)`.
- **lib:** utilidades puras (hash, uuid, jwt, sanitize, políticas).

## 4. Modelo de datos (Neon)

### 4.1 Tablas

| Tabla | PK | Descripción |
|---|---|---|
| `usuarios` | `uuid` (v7) | Usuarios con auth propio. |
| `ejercicios` | `bigint` | Catálogo estático (130 filas). |
| `entrenamientos` | `uuid` (v7) | Sesiones de entrenamiento. |
| `rutinas` | `uuid` (v7) | Rutinas personalizadas. |
| `rutina_ejercicios` | `bigint` | Relación N:M rutina↔ejercicio. |
| `series_entrenamiento` | `uuid` (v7) | Series individuales. |
| `verification_codes` | `uuid` (v4) | OTP hasheados con bcrypt. |
| `password_reset_tokens` | `uuid` (v4) | Tokens de reset (sin implementar aún). |
| `refresh_tokens` | `uuid` (v4) | Refresh tokens hasheados con SHA-256. |
| `_prisma_migrations` | — | Control interno de Prisma. |

### 4.2 Campos clave de `usuarios`

- `idusuario uuid PK` (UUID v7 generado en Node).
- `password_hash` (bcrypt, 12 rondas).
- `email_verified boolean default false`.
- `provider varchar default 'email'` (preparado para OAuth).
- `provider_id varchar null`.
- `intentos_fallidos int default 0`.
- `bloqueado_hasta timestamptz null`.
- `tipo_usuario varchar default 'cliente'`
  (`cliente | admin_gimnasio | super_admin`).

### 4.3 Decisiones de diseño

- **UUID v7** en tablas con datos sensibles: ordenable por tiempo,
  mejor rendimiento de índices que v4. Se genera en Node (Postgres 16
  no lo trae nativo; llega en Postgres 18).
- **`bigint` en `ejercicios` y `rutina_ejercicios`:** catálogo
  estático, no necesita UUID.
- **`@@map` en Prisma:** modelos en PascalCase, tablas en snake_case
  plural (`Usuario` → `usuarios`).
- **Sin RLS:** el control de acceso vive en el backend (middleware +
  repositorios). Simplifica código y debugging.
- **`ON DELETE CASCADE`** en todas las FK hacia `usuarios`.

## 5. Endpoints

| Método | Ruta | Middleware | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | registerLimiter, validateRegister, verifyRecaptcha("register") | Crea cliente + envía OTP. |
| POST | `/api/auth/verify-email` | verifyLimiter, validateVerifyEmail | Valida OTP. |
| POST | `/api/auth/resend-code` | resendLimiter, validateResendCode | Reenvía OTP (cooldown 60 s). |
| POST | `/api/auth/login` | loginLimiter, validateLogin, verifyRecaptcha("login") | Login, setea cookies httpOnly. |
| POST | `/api/auth/refresh` | refreshLimiter | Rota refresh token. |
| POST | `/api/auth/logout` | refreshLimiter | Revoca refresh token. |
| POST | `/api/auth/create-admin` | authLimiter, requireAuth, requireRole("super_admin"), validateAsignarAdmin | super_admin asigna el rol admin y sus sedes a una cuenta existente y verificada. No crea cuentas. |
| GET | `/api/sedes` | — | Catálogo público de sedes. |
| GET | `/api/sedes/:slug/clientes` | requireAuth, requireRole("admin","super_admin") | Clientes de la sede (admin de esa sede o super_admin). |
| POST | `/api/sedes/:slug/clientes` | requireAuth, requireRole("admin","super_admin") | Vincula una cuenta confirmada `{ usuarioId, correo }` como cliente. |
| DELETE | `/api/sedes/:slug/clientes/:usuarioId` | requireAuth, requireRole("admin","super_admin") | Desvincula; la cuenta vuelve a usuario_particular. |
| GET | `/api/gestion/cuentas?correo=` | requireAuth, requireRole("admin","super_admin") | Vista previa de una cuenta por correo exacto. |
| GET | `/api/gestion/clientes-sin-sede` | requireAuth, requireRole("super_admin") | Clientes que aún no tienen sede registrada. |
| GET | `/api/perfil` | perfilLimiter, requireAuth | Devuelve el perfil. |

## 6. Flujo de autenticación

### 6.1 Registro

1. `POST /api/auth/register` con `{ nombres, apellidos, email, password }`.
2. Validación + sanitización.
3. Hash de contraseña con bcrypt.
4. `INSERT` en `usuarios` con `email_verified = false`.
5. Generación de OTP de 6 dígitos con `crypto.randomInt`.
6. Hash del OTP con bcrypt.
7. `INSERT` en `verification_codes` (invalida los anteriores en
   transacción).
8. Envío por Resend.
9. Respuesta: `{ message, userId }`.

### 6.2 Verificación

1. `POST /api/auth/verify-email` con `{ email, code }`.
2. Búsqueda del usuario. Si no existe o ya está verificado → error
   genérico.
3. Búsqueda del OTP activo (no usado, no expirado).
4. Incremento de intentos si el código es incorrecto (máx. 5).
5. Si coincide → `markUsed` + `email_verified = true`.

### 6.3 Login

1. `POST /api/auth/login` con `{ email, password }`.
2. Si `bloqueadoHasta > now` → 429.
3. Búsqueda del usuario. Si no existe → compara contra un `dummyHash`
   para igualar tiempos (anti-enumeración).
4. `comparePassword` con bcrypt.
5. Si falla → `registerFailedLogin` (incrementa; bloquea tras 5
   fallos por 15 min).
6. Si `email_verified = false` → 403.
7. `resetFailedLogins` + generación de tokens:
   - **Access token JWT** (HS256, 15 min) → cookie `access_token`
     (`Path=/`, httpOnly, SameSite=strict).
   - **Refresh token opaco** (32 bytes random) → hasheado con SHA-256
     en `refresh_tokens`.
   - Refresh token original → cookie `refresh_token`
     (`Path=/api/auth`, httpOnly, SameSite=strict, 7 días).

### 6.4 Refresh (rotación)

1. `POST /api/auth/refresh` con cookie `refresh_token`.
2. Búsqueda por hash en `refresh_tokens`.
3. Si `revoked = true` → **revoca TODAS las sesiones del usuario**
   (detección de robo).
4. Si expiró → 401.
5. Genera refresh token nuevo, marca el viejo como `revoked`.
6. Nuevo `access_token` + `refresh_token` en cookies.

### 6.5 Logout

1. `POST /api/auth/logout`.
2. Revoca el refresh token actual.
3. Borra ambas cookies.

## 7. Seguridad

- **Cookies httpOnly** con `Secure` (en producción) y
  `SameSite=Strict`. No accesibles desde JS → inmune a XSS.
- **JWT con algoritmo fijo HS256** (evita ataque `alg: none`).
- **Refresh tokens rotativos** con detección de reuso.
- **Bloqueo tras 5 intentos** de login / 15 min.
- **Rate limiting por endpoint:**
  - `registerLimiter`: 5/hora por IP.
  - `loginLimiter`: 5/15 min por IP+email (solo fallidos).
  - `verifyLimiter`: 10/15 min por IP.
  - `resendLimiter`: 3/15 min por IP.
  - `refreshLimiter`: 30/15 min por IP.
  - `authLimiter`: 10/15 min por IP (create-admin).
- **Anti-enumeración:**
  - Registro con correo duplicado → mismo mensaje.
  - `resend-code` → respuesta siempre genérica.
  - Login → `Credenciales inválidas` tanto si el correo no existe
    como si la contraseña es incorrecta.
  - Dummy hash en login para igualar tiempos.
- **Validación de entrada:**
  - Sanitización de HTML/scripts/caracteres de control.
  - Contraseña: 8-30, letra, número, mayúscula, lista negra, distinta
    de email y nombre.
  - Email: formato + TLD válido + lista negra de dominios desechables.
  - Nombres: 2-60, solo letras/tildes/ñ/espacios/guiones/apóstrofes.
- **Body limit:** `express.json({ limit: '10kb' })`.
- **Helmet:** headers de seguridad (CSP, HSTS, X-Frame-Options, etc.).
- **CORS restringido** al `CLIENT_ORIGIN` con `credentials: true`.
- **Prisma** parametriza todas las queries → inmune a SQL injection.

## 8. Variables de entorno

La lista completa y comentada está en
[`backend/.env.example`](./backend/.env.example). `src/config/env.ts` detiene
el arranque si falta alguna de las variables obligatorias, incluidas las de
Google OAuth y Cloudinary. Extracto:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
TRUST_PROXY=1

DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require&connect_timeout=30
DIRECT_URL=postgresql://.../neondb?sslmode=require

JWT_SECRET=<64 hex chars>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

RESEND_API_KEY=<api key>
EMAIL_FROM=GymPlataforma <noreply@gymplataform.lat>

GOOGLE_CLIENT_ID=<client id>
GOOGLE_CLIENT_SECRET=<client secret>
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/oauth/google/callback

CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
```

`DATABASE_URL` y `DIRECT_URL` determinan la base que usa el backend. Antes de
arrancar o de ejecutar Prisma CLI, confirma que apuntan a una base aislada y
no a las ramas compartidas de Neon (`development`, `production`).

## 9. Dependencias añadidas

- `prisma@7` (dev), `@prisma/client@7`, `@prisma/adapter-neon@7`
- `bcryptjs` + `@types/bcryptjs`
- `uuid` + `@types/uuid`
- `helmet`
- `csv-parse`

## 10. Eliminado respecto a la versión anterior

- Dependencia `@supabase/supabase-js`.
- `src/config/supabase.ts`.
- `src/repositories/authUsers.repository.ts`.
- Variables `SUPABASE_URL`, `SUPABASE_SECRET_KEY` de `env.ts`, `.env`
  y `.env.example`.

## 11. Bootstrap del primer super_admin

La API nunca asigna ni modifica el rol `super_admin`. El primero (y
cualquier otro) se asigna con un script del servidor sobre una cuenta real
ya registrada y verificada, que conserva sus credenciales (correo o Google):

```bash
# 1. Ver la cuenta sin cambiar nada
npx tsx scripts/asignar-super-admin.ts --correo persona@ejemplo.com
# 2. Confirmar con el id exacto que mostró el paso 1
npx tsx scripts/asignar-super-admin.ts --correo persona@ejemplo.com   --confirmar <usuarioId> --motivo "Primer super_admin del proyecto"
```

- Lo autoriza y ejecuta quien administra el servidor y la base.
- Valida el destino antes de escribir: por ahora solo acepta la base local
  `jjgym_pagos` (127.0.0.1:55432) y lo comprueba también con la conexión.
- Si ya existe un super_admin, exige `--adicional`.
- Queda registrado en `auditoria_roles` (origen `cli`, motivo, rol anterior).

## 12. Comandos útiles

```bash
# Generar el cliente Prisma (necesario antes del primer arranque; no usa la base)
npx prisma generate

# Desarrollo
npm run dev

# Typecheck
npm run typecheck

# Migración nueva (usa DIRECT_URL: solo contra una base aislada)
npx prisma migrate dev --name <nombre>

# Ver migraciones aplicadas
npx prisma migrate status

# Abrir Prisma Studio
npx prisma studio
```

## 13. Pendiente

- **Recuperación de contraseña** (`forgot-password` +
  `reset-password`). La tabla `password_reset_tokens` existe pero no
  se usa.
- **Documentación SQL completa** (DDL de las 10 tablas, diagrama de
  relaciones, decisiones).
- **Frontend:** reescribir 14 archivos que dependen de Supabase Auth
  (`AuthContext.jsx`, `middleware.js`, 7 páginas de auth).
- **OAuth** de Google y Microsoft.
- **Docker** (a cargo de otro miembro del equipo).
## reCAPTCHA v3 en el inicio de sesión y el registro

1. Registra una clave de reCAPTCHA v3 en la [consola de Google](https://www.google.com/recaptcha/admin/create). Agrega los dominios donde se sirve el frontend y conserva activa la validación de dominios de Google. Para pruebas locales, registra `localhost` en una clave de desarrollo.
2. En el backend, configura `RECAPTCHA_SECRET_KEY` con la clave secreta. El umbral `RECAPTCHA_MIN_SCORE` es opcional y vale `0.5` por defecto.
3. En el frontend, configura `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` con la clave pública del mismo registro. En Vercel, configura la variable antes de volver a compilar y desplegar el frontend.
4. Despliega el frontend con la clave pública y activa después la verificación en el backend. Con la clave secreta configurada, `POST /api/auth/login` y `POST /api/auth/register` exigen un token válido para su acción respectiva (`login` o `register`) en cada intento. Sin la clave secreta, la verificación queda desactivada.

La integración cubre el acceso con correo y contraseña y el registro público. El acceso con Google usa su flujo OAuth. En un entorno con las claves configuradas, comprueba que puedas iniciar sesión y que el registro exitoso y el acceso con un correo pendiente de confirmar lleven a la pantalla del código de verificación.

## 14. Roles, sedes y cuentas reales

Todas las cuentas se registran por el flujo público (correo o Google) como
`usuario_particular`. Los demás roles se asignan sobre esa misma cuenta, que
conserva sus credenciales; el rol se lee de la base en cada petición
(`requireRole`), así que un cambio aplica desde la siguiente petición.

| Rol | Quién lo asigna | Sede |
|---|---|---|
| `usuario_particular` | Registro público | — |
| `cliente` | Admin de la sede o super_admin (`POST /api/sedes/:slug/clientes`) | Una sola, en `miembros_sede` |
| `admin` | super_admin (`POST /api/auth/create-admin`) | Una o más, en `admin_sedes` |
| `super_admin` | Script `scripts/asignar-super-admin.ts` | — |

- Toda asignación confirma la cuenta con `usuarioId` y correo, exige correo
  verificado, impide cambiar la propia cuenta y deja registro en
  `auditoria_roles` en la misma transacción.
- Desvincular a un cliente lo devuelve a `usuario_particular`.
- La sede del cliente sale de `miembros_sede` (perfil, panel y reseñas); el
  parámetro `?gym=` ya no define pertenencia.
- Los intentos y el historial de pagos se conservan en cualquier cambio.
- Clientes sin sede (por ejemplo, creados antes de `miembros_sede`):
  conservan el rol, el panel les indica que no tienen sede, no pueden
  reseñar y aparecen en `GET /api/gestion/clientes-sin-sede` para que un
  admin o un super_admin les asigne una.

### Cambio de rol y suscripciones personales (pendiente)

Hoy no existe un mecanismo que determine si una suscripción personal está
activa: el webhook de Wompi solo actualiza el intento de pago y la
activación o renovación de suscripciones aún no está implementada. Por eso
vincular a un particular como cliente, o asignarle admin, **no se bloquea**.
La vista previa de la cuenta muestra `pagos_personales_aprobados` para que
quien asigna lo vea.

Antes de habilitar este flujo en una base compartida (Neon) hay que
decidir qué pasa con una suscripción personal vigente al cambiar de rol
(bloquear el cambio, conservarla hasta su vencimiento o reembolsar) e
implementarlo cuando exista la activación de suscripciones.

