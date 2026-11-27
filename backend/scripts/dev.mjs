import { lstatSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

let ensayo = true;
try {
  lstatSync(new URL("../.env.ensayo-path.local", import.meta.url));
} catch (error) {
  if (error.code !== "ENOENT") {
    console.error("No se pudo comprobar la referencia de ensayo. Arranque cancelado.");
    process.exit(1);
  }
  ensayo = false;
}
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const proceso = spawn(process.execPath, [tsx, "watch", ensayo ? "src/dev/serverEnsayo.ts" : "src/server.ts"],
  { stdio: "inherit" });
proceso.on("error", () => { console.error("No se pudo iniciar tsx."); process.exitCode = 1; });
proceso.on("exit", code => { process.exitCode = code ?? 1; });
for (const señal of ["SIGINT", "SIGTERM"]) process.once(señal, () => proceso.kill(señal));
