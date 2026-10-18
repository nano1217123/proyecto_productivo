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

Supabase ya no participa en el backend. El frontend aún no se ha
migrado (sigue usando `supabase-js`); se hará en una fase posterior.

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
| POST | `/api/auth/register` | registerLimiter, validateRegister | Crea cliente + envía OTP. |
| POST | `/api/auth/verify-email` | verifyLimiter, validateVerifyEmail | Valida OTP. |
| POST | `/api/auth/resend-code` | resendLimiter, validateResendCode | Reenvía OTP (cooldown 60 s). |
| POST | `/api/auth/login` | loginLimiter, validateLogin | Login, setea cookies httpOnly. |
| POST | `/api/auth/refresh` | refreshLimiter | Rota refresh token. |
| POST | `/api/auth/logout` | refreshLimiter | Revoca refresh token. |
| POST | `/api/auth/create-admin` | authLimiter, requireAuth, requireRole, validateCreateAdmin | super_admin crea admins. |
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
```

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

Como `/create-admin` requiere ser super_admin, el primero se crea
manualmente:

1. Registrar el usuario con `/register`.
2. Verificar su correo con `/verify-email`.
3. Generar el hash bcrypt de la contraseña con un script temporal.
4. Ejecutar en Neon:
   ```sql
   UPDATE usuarios
   SET tipo_usuario = 'super_admin',
       email_verified = true,
       password_hash = '<HASH_BCRYPT>'
   WHERE correo = '<email>';
   ```
5. Borrar el script temporal.

A partir de ese usuario, se pueden crear otros admins desde la API.

## 12. Comandos útiles

```bash
# Desarrollo
npm run dev

# Typecheck
npm run typecheck

# Migración nueva
npx prisma migrate dev --name <nombre>

# Regenerar cliente Prisma
npx prisma generate

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