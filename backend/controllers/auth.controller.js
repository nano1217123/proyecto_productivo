import { supabaseAdmin } from "../lib/supabaseAdmin.js";

// 'super_admin' y 'desarrollador' siguen sin poder crearse desde ningún
// endpoint: se asignan manualmente en el Table Editor de Supabase por un
// desarrollador existente. Este controlador solo permite crear
// admin_gimnasio, y únicamente lo puede llamar alguien ya autenticado
// con rol super_admin o desarrollador (ver requireAuth + requireRole
// en la ruta).
const TIPOS_ADMIN_PERMITIDOS = ["admin_gimnasio"];

// POST /api/auth/create-admin
// body: { nombres, apellidos, email, password, tipoUsuario }
export async function createAdmin(req, res) {
  const { nombres, apellidos, email, password, tipoUsuario } = req.body || {};

  if (!nombres || !apellidos || !email || !password || !tipoUsuario) {
    return res.status(400).json({
      message:
        "Faltan campos requeridos: nombres, apellidos, email, password, tipoUsuario.",
    });
  }

  const nombresTrim = nombres.trim();
  const apellidosTrim = apellidos.trim();
  const emailTrim = email.trim();

  if (!nombresTrim || !apellidosTrim) {
    return res.status(400).json({
      message: "Nombres y apellidos no pueden estar vacíos ni contener solo espacios.",
    });
  }

  if (nombresTrim.length > 60 || apellidosTrim.length > 60) {
    return res.status(400).json({
      message: "Nombres y apellidos no pueden superar los 60 caracteres.",
    });
  }

  if (!emailTrim || emailTrim.length > 254) {
    return res.status(400).json({ message: "El correo no es válido." });
  }

  if (!TIPOS_ADMIN_PERMITIDOS.includes(tipoUsuario)) {
    return res.status(400).json({
      message: `tipoUsuario debe ser uno de: ${TIPOS_ADMIN_PERMITIDOS.join(", ")}.`,
    });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "La contraseña debe tener al menos 8 caracteres." });
  }

  if (password.length > 30) {
    return res
      .status(400)
      .json({ message: "La contraseña no puede superar los 30 caracteres." });
  }

  try {
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: emailTrim,
        password,
        email_confirm: false,
        user_metadata: {
          nombres: nombresTrim,
          apellidos: apellidosTrim,
          tipo_usuario: tipoUsuario,
        },
      });

    if (createError) {
      const status = createError.status || 400;
      return res.status(status).json({ message: createError.message });
    }

    const { error: resendError } = await supabaseAdmin.auth.resend({
      type: "signup",
      email: emailTrim,
    });

    if (resendError) {
      return res.status(201).json({
        message:
          "Administrador creado, pero hubo un problema enviando el código de verificación. Puede reenviarlo desde la pantalla de verificación.",
        userId: created.user.id,
        emailSendError: true,
      });
    }

    return res.status(201).json({
      message: "Administrador creado. Debe verificar su correo con el código enviado.",
      userId: created.user.id,
    });
  } catch (err) {
    console.error("Error detallado en servidor:", err.message);
    return res.status(500).json({
      message: "Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.",
    });
  }
}