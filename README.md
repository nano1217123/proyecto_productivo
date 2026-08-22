# Módulo de autenticación — Next.js + Node.js + Supabase

Registro con verificación por código de 6 dígitos, login, contraseñas
cifradas (gestionadas por Supabase Auth), y una tabla `usuarios` con
seguimiento de suscripción.

## Requisitos previos (ya deberías tenerlos hechos)

1. Proyecto creado en [supabase.com](https://supabase.com).
2. Tabla `usuarios` creada con el script SQL (ver `supabase-schema.sql`).
3. SMTP personalizado conectado (ej. Resend) en Authentication → Emails.
4. Plantilla "Confirm signup" editada para usar `{{ .Token }}` (código de
   6 dígitos) en vez de `{{ .ConfirmationURL }}`.

## 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Completa SUPABASE_URL y SUPABASE_SECRET_KEY con tus valores reales
npm run dev
```

## 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

## 3. Flujo completo

1. `/register` → el usuario ingresa nombres, apellidos, correo y
   contraseña. Supabase crea el registro en `auth.users` (contraseña
   cifrada automáticamente) y el trigger de la base de datos crea la
   fila correspondiente en `public.usuarios`.
2. Supabase envía un correo con un código de 6 dígitos.
3. `/verify-otp` → el usuario ingresa el código. Se confirma su cuenta.
4. `/login` → inicio de sesión normal con email + contraseña.
5. `/dashboard` → muestra los datos del perfil, incluyendo si la
   suscripción sigue activa según `tiempo_duracion_inscripcion`.

## Por qué ya no hay bcrypt ni JWT manual

Supabase Auth (el servicio `auth.users`) ya hace esto internamente:

- Cifra las contraseñas con un algoritmo seguro antes de guardarlas —
  nunca las ves ni las tocas tú.
- Genera y verifica el código de 6 dígitos.
- Firma y valida los JWT de sesión.
- Renueva la sesión automáticamente en el frontend (`supabase-js` lo
  hace solo).

El backend Node.js ahora solo se usa para lógica adicional que
necesite privilegios de administrador (ver `routes/perfil.routes.js`
como ejemplo) — verifica el token de sesión con
`supabaseAdmin.auth.getUser(token)`.

## Sobre `tiempo_duracion_inscripcion`

Es un campo tipo `interval` de PostgreSQL (ej. `30 days`). Representa
cuánto dura la suscripción del usuario desde que se registró. Para
saber si sigue activa:

```
activa = (tiempo_registrado + tiempo_duracion_inscripcion) > ahora()
```

Esto ya está calculado en `frontend/app/dashboard/page.jsx`. Si más
adelante quieres renovar la suscripción manualmente, puedes actualizar
`tiempo_registrado` a la fecha de renovación, o cambiar
`tiempo_duracion_inscripcion` a un valor mayor.

## Siguientes pasos sugeridos

1. **Recuperar contraseña**: Supabase ya soporta
   `supabase.auth.resetPasswordForEmail(email)` — se puede agregar una
   página `/forgot-password` con el mismo patrón que `login`.
2. **Tipos de usuario**: usa la columna `tipo_usuario` para mostrar u
   ocultar funciones según el plan (ej. `'estandar'`, `'premium'`).
3. **Panel de administrador**: usa `supabaseAdmin` en el backend para
   listar todos los usuarios y gestionar sus suscripciones sin
   restricciones de RLS.
