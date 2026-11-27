import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ensayo = existsSync(new URL("../../backend/.env.ensayo-path.local", import.meta.url));
const cli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const argumentos = ensayo ? ["--webpack", "--hostname", "127.0.0.1", "--port",
  process.env.JJGYM_DEV_WEB_PORT ?? "3000"] : process.argv.slice(2);
const env = ensayo ? { ...process.env, BACKEND_URL: `http://127.0.0.1:${process.env.JJGYM_DEV_API_PORT ?? "4000"}`,
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "" } : process.env;
const proceso = spawn(process.execPath, [cli, "dev", ...argumentos], { env, stdio: "inherit" });
proceso.on("error", () => { console.error("No se pudo iniciar Next.js."); process.exitCode = 1; });
proceso.on("exit", code => { process.exitCode = code ?? 1; });
for (const señal of ["SIGINT", "SIGTERM"]) process.once(señal, () => proceso.kill(señal));
