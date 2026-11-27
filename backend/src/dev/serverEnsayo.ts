import { once } from "node:events";
import { configurarEnsayo, endpoint } from "./ensayo.js";

let fase = "verificar las conexiones Neon";
try {
  const esperado = await configurarEnsayo();
  fase = "validar la configuración efectiva";
  const { env } = await import("../config/env.js");
  if (env.databaseUrl !== esperado.DATABASE_URL || env.directUrl !== esperado.DIRECT_URL ||
      process.env.PARTICULAR_METRICAS_DIARIAS !== "false") throw new Error();
  fase = "abrir el puerto local";
  const { default: app } = await import("../app.js");
  const server = app.listen(env.port, "127.0.0.1");
  await once(server, "listening");
  console.log(`Express http://127.0.0.1:${env.port} · ensayo verificado (${endpoint})`);
} catch (error) {
  const detalle = (error as NodeJS.ErrnoException).code === "EADDRINUSE" ? " El puerto está ocupado." : "";
  console.error(`Arranque cancelado al ${fase}.${detalle}`);
  process.exitCode = 1;
}
