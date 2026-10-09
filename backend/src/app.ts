import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import routes from "./routes/index.js";

const app = express();

// Necesario para que express-rate-limit identifique la IP real del cliente
// cuando el backend corre detrás de un proxy inverso (Render, Railway,
// Nginx, etc.). El valor viene de TRUST_PROXY (ver config/env.ts).
app.set("trust proxy", env.trustProxy);

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "API de autenticación funcionando." });
});

app.use("/api", routes);

// Debe ir al final: captura JSON malformado, body demasiado grande y
// cualquier error lanzado en rutas, middleware, servicios o repositorios.
app.use(errorHandler);

export default app;