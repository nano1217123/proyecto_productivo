import { supabaseAdmin } from "../lib/supabaseAdmin.js";

const TIPOS_VALIDOS = ["cliente", "admin_gimnasio", "super_admin"];// 'desarrollador' nunca se puede pedir desde aquí — se asigna manualmente
// en el Table Editor de Supabase por un desarrollador existente.

// POST /api/auth/register
// body: { nombres, apellidos, email, password, tipoUsuario, claveAdmin? }
export async function register(req, res) {
  const { nombres, apellidos, email, password, tipoUsuario, claveAdmin } =
    req.body || {};

  // 1. Validación básica de campos
  if (!nombres || !apellidos || !email || !password || !tipoUsuario) {
    return res.status(400).json({
      message:
        "Faltan campos requeridos: nombres, apellidos, email, password, tipoUsuario.",
    });
  }

  if (!TIPOS_VALIDOS.includes(tipoUsuario)) {
    return res.status(400).json({
      message: `tipoUsuario debe ser uno de: ${TIPOS_VALIDOS.join(", ")}.`,
    });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "La contraseña debe tener al menos 8 caracteres." });
  }

  // 2. Si pide ser admin, validar la clave secreta
  // 2. Si pide un rol con clave secreta, validarla
    const CLAVES_POR_TIPO = {
      admin_gimnasio: {
        env: "ADMIN_SIGNUP_KEY",
        mensajeError: "Clave de administrador incorrecta.",
      },
      super_admin: {
        env: "SUPER_ADMIN_SIGNUP_KEY",
        mensajeError: "Clave de super administrador incorrecta.",
      },
    };

    if (CLAVES_POR_TIPO[tipoUsuario]) {
      const { env, mensajeError } = CLAVES_POR_TIPO[tipoUsuario];
      const claveEsperada = process.env[env];

      if (!claveEsperada) {
        console.error(`${env} no está configurada en backend/.env`);
        return res
          .status(500)
          .json({ message: "Registro con clave no disponible." });
      }

      if (!claveAdmin || claveAdmin !== claveEsperada) {
        return res.status(403).json({ message: mensajeError });
      }
    }

  try {
    // 3. Crear el usuario en auth.users con la secret key.
    // email_confirm: false -> queda sin confirmar, dispara el trigger
    // handle_new_user() igual (se ejecuta en el insert, no en la confirmación).
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          nombres,
          apellidos,
          tipo_usuario: tipoUsuario,
        },
      });

    if (createError) {
      // Caso común: el correo ya está registrado.
      const status = createError.status || 400;
      return res.status(status).json({ message: createError.message });
    }

    // 4. admin.createUser NO manda el correo de verificación por sí solo:
    // hay que disparar el reenvío para que salga el código de 6 dígitos.
    const { error: resendError } = await supabaseAdmin.auth.resend({
      type: "signup",
      email,
    });

    if (resendError) {
      // El usuario ya se creó, pero el correo de verificación falló.
      return res.status(201).json({
        message:
          "Cuenta creada, pero hubo un problema enviando el código de verificación. Intenta reenviarlo desde la pantalla de verificación.",
        userId: created.user.id,
        emailSendError: true,
      });
    }

    return res.status(201).json({
      message: "Cuenta creada. Revisa tu correo para el código de verificación.",
      userId: created.user.id,
    });

  } catch (err) {
    // Aquí atrapamos cualquier error inesperado y lo dejamos registrado en consola
    console.error("Error detallado en servidor:", err.message); 
    
    // Y devolvemos un mensaje seguro y controlado al cliente
    return res.status(500).json({ 
      message: "Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo." 
    });
  }
}