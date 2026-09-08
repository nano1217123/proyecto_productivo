import "dotenv/config";
import express from 'express';
import cors from 'cors';
import perfilRoutes from "./routes/perfil.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

// Necesario para que express-rate-limit (auth.routes.js) identifique
// correctamente la IP real de cada cliente cuando el backend corre detrás
// de un proxy inverso o balanceador (Render, Railway, Vercel, Nginx, etc.).
// Sin esto, express-rate-limit puede tratar a todos los usuarios como una
// sola IP (el proxy), o directamente rechazar peticiones si detecta la
// cabecera X-Forwarded-For sin este ajuste. "1" confía en un solo salto de
// proxy frente a la app (el caso típico); ajusta con la variable de entorno
// TRUST_PROXY si tu proveedor usa más de un salto, o a "false" si corres
// sin ningún proxy delante (ej. localhost puro).
const trustProxySetting = process.env.TRUST_PROXY ?? "1";
app.set(
  "trust proxy",
  trustProxySetting === "false" ? false : Number.isNaN(Number(trustProxySetting)) ? trustProxySetting : Number(trustProxySetting)
);

const PORT = process.env.PORT || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN;

if (process.env.NODE_ENV === 'production' && !clientOrigin) {
  console.error("ERROR CRÍTICO: La variable de entorno CLIENT_ORIGIN no está definida para producción.");
  process.exit(1); 
}

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/perfil", perfilRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "API de autenticación funcionando." });
});

// Error handler global — captura JSON malformado, body demasiado grande,
// y cualquier error no manejado en las rutas, para que SIEMPRE se responda
// JSON (nunca HTML crudo ni que el proceso truene sin respuesta).
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "El cuerpo de la solicitud no es JSON válido." });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "La solicitud es demasiado grande." });
  }

  console.error("Error no manejado:", err);
  return res.status(500).json({ message: "Ocurrió un error inesperado en el servidor." });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});