# Documentación del proyecto — Módulo de login (Next.js + Node.js + Supabase)

Este documento resume todo lo construido y decidido hasta ahora, para continuar
el trabajo en una nueva conversación. Súbelo junto con el `.zip` del proyecto.

---

## 1. Stack y arquitectura

- **Frontend**: Next.js (App Router), en `frontend/`
- **Backend**: Node.js + Express, en `backend/`
- **Base de datos y autenticación**: Supabase (Postgres + Supabase Auth)
- Supabase gestiona automáticamente: cifrado de contraseñas (bcrypt, en
  `auth.users.encrypted_password`), sesiones (JWT), y el envío de correos
  de verificación.

## 2. Base de datos (Supabase)

Tabla `public.usuarios`, conectada 1 a 1 con `auth.users` vía UUID:

| Columna | Tipo | Notas |
|---|---|---|
| `idusuario` | uuid | PK, FK a `auth.users.id` |
| `nombres` | varchar | |
| `apellidos` | varchar | |
| `correo` | varchar | único |
| `tipo_usuario` | varchar | `'cliente'` \| `'admin_gimnasio'` \| `'desarrollador'`, default `'cliente'`, con `check constraint` |
| `tiempo_registrado` | timestamptz | default `now()` |
| `tiempo_duracion_inscripcion` | interval | default `30 days` — duración de la suscripción |

**Row Level Security** activado: cada usuario solo puede ver/editar su propia fila.

**Trigger `handle_new_user`**: al crearse un usuario en `auth.users`, inserta
automáticamente su fila en `usuarios`, leyendo `nombres`, `apellidos` y
`tipo_usuario` desde `raw_user_meta_data`. Solo acepta `'cliente'` o
`'admin_gimnasio'` desde el registro público — `'desarrollador'` se asigna
manualmente por un desarrollador existente (Table Editor de Supabase), nunca
por registro automático, por seguridad.

Scripts SQL relevantes (deberían estar en el `.zip`):
- `supabase-schema.sql` — script completo original.
- `supabase-migration-tipos-usuario.sql` — migración que agrega los 3 tipos
  de usuario a una tabla ya existente. **Ya ejecutado.**

⚠️ **Pendiente**: el trigger todavía espera `nombres`/`apellidos` desde el
formulario propio. Con el login de Google (ver sección 5), estos campos no
llegan igual — hace falta ajustar el trigger o agregar un paso de "completar
perfil". Ver sección 5.

## 3. Verificación de correo (código de 6 dígitos)

- El registro **NO** usa el magic link por defecto de Supabase — se configuró
  para enviar un código de 6 dígitos en su lugar.
- **SMTP personalizado**: se conectó Resend (Authentication → Emails → SMTP
  Settings) porque desde junio 2026 Supabase bloquea la edición de plantillas
  de correo en proyectos free sin SMTP propio.
- **Plantilla "Confirm signup"** editada para usar `{{ .Token }}` en vez de
  `{{ .ConfirmationURL }}`.
- **Longitud del OTP**: se cambió de 8 a 6 dígitos en Authentication → Sign In
  / Providers → Email → "Email OTP Length".
- ⚠️ **Limitación activa de Resend**: mientras no se verifique un dominio
  propio en Resend, solo se pueden enviar correos a la dirección con la que
  te registraste en Resend (no a correos de terceros, ej. amigos). Para
  levantar esta limitación: verificar un dominio propio en resend.com/domains
  (agregar registros DNS) y cambiar el sender en Supabase de
  `onboarding@resend.dev` a algo como `noreply@tudominio.com`. **Pendiente,
  no resuelto todavía** (se pausó para priorizar Google OAuth).

## 4. Roles de usuario y clave de administrador

Se implementó un endpoint de registro propio en el backend (en vez de que el
frontend llame a Supabase directo) para poder validar de forma segura la
clave que deben tener los administradores de gimnasio:

- `backend/.env` → variable `ADMIN_SIGNUP_KEY` (clave secreta elegida por los
  desarrolladores, nunca se expone al frontend).
- `POST /api/auth/register` (`backend/controllers/auth.controller.js`):
  recibe `{ nombres, apellidos, email, password, tipoUsuario, claveAdmin }`.
  Si `tipoUsuario === 'admin_gimnasio'`, valida `claveAdmin` contra
  `ADMIN_SIGNUP_KEY` — si no coincide, responde 403. Crea el usuario con
  `supabaseAdmin.auth.admin.createUser(...)` (usa la *secret key*, con
  `email_confirm: false`), y luego llama a
  `supabaseAdmin.auth.resend({ type: 'signup', email })` para disparar el
  envío del código de 6 dígitos (confirmado que `admin.createUser` **no**
  envía el correo por sí solo).
- El rol `'desarrollador'` nunca se puede pedir desde este endpoint — se
  asigna manualmente en la base de datos.

⚠️ **Pendiente de conectar en el frontend**: el formulario de
`frontend/app/register/page.jsx` todavía llama al flujo viejo (Supabase
directo desde el frontend, sin selector de tipo de cuenta ni campo de clave
de admin). Falta:
1. Agregar selector "Tipo de cuenta" (Cliente / Administrador de gimnasio).
2. Mostrar campo "Clave de administrador" solo si elige admin.
3. Cambiar el `submit` del formulario para llamar a
   `POST {NEXT_PUBLIC_API_URL}/api/auth/register` en vez de
   `supabase.auth.signUp` directo.

## 4.b ✅ Endpoint de registro con clave de admin — implementado

Ya existe `backend/controllers/auth.controller.js` con
`POST /api/auth/register`:
- Valida campos requeridos y que `tipoUsuario` sea `'cliente'` o
  `'admin_gimnasio'` (nunca `'desarrollador'` desde aquí).
- Si `tipoUsuario === 'admin_gimnasio'`, compara `claveAdmin` contra
  `process.env.ADMIN_SIGNUP_KEY` (agregada a `backend/.env` — **cámbiala**
  del valor de ejemplo `cambia-esta-clave-por-una-tuya` a algo tuyo).
- Crea el usuario con `supabaseAdmin.auth.admin.createUser(...)`
  (`email_confirm: false`), pasando `nombres`/`apellidos`/`tipo_usuario` en
  `user_metadata` — el trigger `handle_new_user` los toma igual que con el
  flujo viejo, sin entrar a la rama de "partir full_name" que es solo para
  Google.
- Llama a `supabaseAdmin.auth.resend({ type: 'signup', email })` para
  disparar el código de 6 dígitos.
- Ruta registrada en `server.js` vía `backend/routes/auth.routes.js`.

`frontend/app/register/page.jsx` ya no llama a `supabase.auth.signUp`
directo: ahora hace `fetch` a `${NEXT_PUBLIC_API_URL}/api/auth/register`, y
el formulario tiene un selector "Tipo de cuenta" (Cliente / Administrador)
que muestra el campo "Clave de administrador" solo si eliges admin.

**Pendiente de probar** (no se ha probado en esta sesión): registrar un
`admin_gimnasio` con la clave correcta y confirmar que en la tabla
`usuarios` queda `tipo_usuario = 'admin_gimnasio'`; y registrar uno con la
clave incorrecta y confirmar que da 403 sin crear la cuenta.

## 5. Login con Google (código ya agregado — falta probar)

**Decisión tomada**: Google OAuth se usa **solo para clientes**. Los
administradores de gimnasio siguen entrando por correo/contraseña + clave de
admin (porque Google no tiene forma de pedir esa clave durante su flujo).

Fricciones identificadas (aún sin resolver en código):
- Los usuarios que entran por Google no pasan por nuestro formulario, así que
  el trigger de la base de datos no recibe `nombres`/`apellidos` en el mismo
  formato — Google entrega `full_name`/`name`/`picture` en el metadata, no
  `nombres`/`apellidos` por separado. Falta decidir: ¿partir `full_name` en
  el trigger, o pedir apellido en una pantalla de "completa tu perfil" tras
  el primer login con Google?
- Los usuarios de Google ya vienen con el correo verificado por Google — no
  necesitan pasar por `/verify-otp`.

**Estado del setup de Google Cloud (lo que ya se hizo):**
1. Proyecto de Google Cloud creado (nombre del proyecto: `JJGym`).
2. Pantalla de consentimiento OAuth ("Google Auth Platform") configurada:
   - Información de la app completada.
   - Tipo de público: **External**.
   - Información de contacto completada.
   - Pantalla de consentimiento creada.
3. **Pendiente / último paso en curso**: publicar la app (cambiar de
   "Prueba"/Testing a "En producción"/In production) en la sección
   **Público**, para no quedar limitados a 100 usuarios de prueba.
4. **Pendiente**: crear el Client ID y Client Secret en la sección
   **Clientes** (Clients) → Crear cliente → Aplicación web → agregar el URI
   de redirección:
   ```
   https://TU-PROJECT-REF.supabase.co/auth/v1/callback
   ```
   (reemplazar `TU-PROJECT-REF` por el ID del proyecto de Supabase, la
   primera parte de `NEXT_PUBLIC_SUPABASE_URL`).
5. **Pendiente**: pegar el Client ID y Client Secret en Supabase →
   Authentication → Providers → Google → activar y guardar.
6. **Pendiente (código)**: en el frontend, agregar un botón "Continuar con
   Google" en `/login` (y opcionalmente `/register`) que llame a:
   ```js
   await supabase.auth.signInWithOAuth({
     provider: "google",
     options: { redirectTo: `${window.location.origin}/auth/callback` },
   });
   ```
   Y crear la página `frontend/app/auth/callback/page.jsx` que reciba el
   redirect de vuelta y mande al usuario a `/dashboard` (el `AuthContext` ya
   debería detectar la sesión automáticamente vía `onAuthStateChange`).

## 6. Credenciales necesarias (recordatorio de dónde van)

**`backend/.env`** (nunca se sube a git, nunca va en el frontend):
```
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
SUPABASE_URL=https://TU-PROJECT-REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxx
ADMIN_SIGNUP_KEY=tu-clave-secreta-para-admins
```

**`frontend/.env.local`**:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxx
```
(Sin comillas, sin espacios alrededor del `=`.)

**Resend** (API key): va SOLO en el dashboard de Supabase (Authentication →
Emails → SMTP Settings → Password), nunca en los archivos `.env` del proyecto.

**Google OAuth** (Client ID / Client Secret): van SOLO en el dashboard de
Supabase (Authentication → Providers → Google), nunca en los archivos `.env`
del proyecto — Supabase actúa como intermediario del flujo OAuth.

## 7. Errores ya resueltos (por si reaparecen)

- **"Invalid API key"** al registrar → causado por un typo en
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, o por no reiniciar `npm run dev`
  del frontend después de editar `.env.local` (Next.js solo lee las env vars
  al arrancar).
- **"Error sending confirmation email"** al registrar con un correo que no es
  el tuyo → limitación de Resend en modo sandbox (ver sección 3).
- **`check constraint "tipo_usuario_valido" ... is violated`** al migrar la
  tabla → causado por filas viejas con `tipo_usuario = 'estandar'`; se debe
  actualizar los datos existentes ANTES de aplicar el `check constraint`.
- Supabase renombró sus API keys: ya no son "anon" / "service_role" para
  proyectos nuevos, ahora son **"Publishable"** / **"Secret"** (mismo
  concepto). Se encuentran en Project Settings → API Keys → pestaña
  "Publishable and secret API keys".

## 8. Próximos pasos sugeridos (en orden) — actualizado

1. ~~Terminar de publicar la app de Google y crear el Client ID/Secret.~~
   Confirmado hecho por el usuario.
2. ~~Conectar Google en Supabase (Authentication → Providers → Google).~~
   Confirmado hecho por el usuario.
3. ~~Escribir el botón "Continuar con Google" + página `/auth/callback`.~~
   Hecho en esta sesión: botón en `/login` y `/register`, página
   `frontend/app/auth/callback/page.jsx`, función `loginWithGoogle` en
   `AuthContext.jsx`.
4. ~~Decidir cómo se completan `nombres`/`apellidos` para usuarios de
   Google.~~ Hecho: se agregó `supabase-migration-google-oauth.sql`, que
   actualiza el trigger `handle_new_user` para partir `full_name`/`name` de
   Google en `nombres`/`apellidos` cuando no vienen del formulario propio.
   **Falta ejecutar esta migración en el SQL Editor de Supabase.**
5. ~~Escribir `POST /api/auth/register` con clave de admin y conectar el
   formulario.~~ Hecho — ver sección 4.b. **Falta probar**: registrar un
   admin_gimnasio con clave correcta e incorrecta y confirmar el resultado
   en la tabla `usuarios`.
6. ~~Probar el flujo de Google de punta a punta.~~ Hecho — confirmado
   funcionando para dos usuarios distintos (dueño del proyecto y un
   compañero usando el mismo `.env`/proyecto de Supabase).
7. **En progreso**: comprar un dominio propio para verificar en Resend, y
   poder enviar el código de verificación a cualquier destinatario (hoy
   solo llega al correo del dueño de la cuenta de Resend).
8. (Opcional, idea futura) Desplegar en Vercel — el dominio propio que se
   compre puede usarse tanto para Vercel como para verificar el dominio en
   Resend.

## 9. Nota sobre sesiones (para no confundirse en pruebas futuras)

El `access_token` de Supabase (JWT) queda guardado en `localStorage` del
navegador y es válido por sí mismo (~1 hora) sin que la app vuelva a
preguntarle a Supabase si el usuario todavía existe. Por eso, si borras un
usuario desde Authentication → Users pero no cierras sesión en el
navegador, la app puede seguir "viéndose logueada" con datos que ya no
existen — es una sesión en caché, no una falla de seguridad. Para
verificar de verdad si una sesión sigue siendo válida en el servidor:
`await supabase.auth.getUser()` desde la consola (a diferencia de
`getSession()`, esa sí consulta a Supabase). Para pruebas limpias sin
sesiones viejas de por medio, usar ventana de incógnito.
