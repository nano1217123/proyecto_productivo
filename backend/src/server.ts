import app from "./app.js";
import { env } from "./config/env.js";
import { moderacionResenasRepository } from "./repositories/moderacionResenas.repository.js";

app.listen(env.port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${env.port}`);
  if (!env.isProduction && process.env.MODERACION_DEPURACION === "true") {
    let enCurso = false;
    const depurar = async () => {
      if (enCurso) return;
      enCurso = true;
      try {
        console.info("Depuración de moderación", await moderacionResenasRepository.depurar());
      } catch {
        console.error("Falló la depuración de moderación.");
      } finally {
        enCurso = false;
      }
    };
    void depurar();
    setInterval(depurar, 60_000).unref();
  }
});
