import "dotenv/config";
import express from 'express';
import cors from 'cors';
import perfilRoutes from "./routes/perfil.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();
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

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/perfil", perfilRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "API de autenticación funcionando." });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});