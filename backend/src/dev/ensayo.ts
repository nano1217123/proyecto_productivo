import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { neon } from "@neondatabase/serverless";

export const rutaReferencia = new URL("../../.env.ensayo-path.local", import.meta.url);
const branch = "br-purple-glade-b5ckib57";
export const endpoint = "ep-nameless-grass-b57vjbs8";

export function validarUrlEnsayo(valor: string | undefined, directa: boolean) {
  let url: URL;
  try { url = new URL(valor ?? ""); }
  catch { throw new Error("Falta una URL válida de ensayo."); }
  const host = new RegExp(`^${endpoint}${directa ? "" : "(?:-pooler)?"}\\.[a-z0-9.-]+\\.neon\\.tech$`);
  const parametros = [...url.searchParams.keys()];
  if (!host.test(url.hostname) || !/^postgres(?:ql)?:$/.test(url.protocol) ||
      url.pathname !== "/neondb" || (url.port && url.port !== "5432") || url.hash ||
      url.searchParams.get("sslmode") !== "require" ||
      ![null, "public"].includes(url.searchParams.get("schema")) ||
      new Set(parametros).size !== parametros.length ||
      parametros.some(p => !["sslmode", "schema", "channel_binding", "connect_timeout"].includes(p))) {
    throw new Error("La URL no corresponde al endpoint autorizado de ensayo.");
  }
  return valor!;
}

export function verificarIdentidad(fila: Record<string, string> | undefined) {
  if (fila?.branch !== branch || fila.db !== "neondb" || fila.schema !== "public" || fila.lectura !== "on") {
    throw new Error("PostgreSQL no confirmó la identidad de ensayo.");
  }
}

export async function configurarEnsayo() {
  const ruta = readFileSync(rutaReferencia, "utf8").trim();
  if (!ruta || /[\r\n]/.test(ruta)) throw new Error("La referencia debe contener solo una ruta.");
  const archivo = parse(readFileSync(ruta, "utf8"));
  const DATABASE_URL = validarUrlEnsayo(archivo.DATABASE_URL, false);
  const DIRECT_URL = validarUrlEnsayo(archivo.DIRECT_URL, true);
  for (const url of [DATABASE_URL, DIRECT_URL]) {
    const sql = neon(url);
    const [filas] = await sql.transaction([sql.query(`
      SELECT current_setting('neon.branch_id', true) AS branch,
        current_database()::text AS db, current_schema()::text AS schema,
        current_setting('transaction_read_only') AS lectura
    `)], { readOnly: true, fetchOptions: { signal: AbortSignal.timeout(15000) } });
    verificarIdentidad(filas[0]);
  }
  const efectivo = { DATABASE_URL, DIRECT_URL, PORT: process.env.JJGYM_DEV_API_PORT ?? "4000", NODE_ENV: "development",
    CLIENT_ORIGIN: `http://127.0.0.1:${process.env.JJGYM_DEV_WEB_PORT ?? "3000"}`, PARTICULAR_METRICAS_DIARIAS: "false",
    RECAPTCHA_SECRET_KEY: "", RESEND_API_KEY: "", WOMPI_PUBLIC_KEY: "",
    WOMPI_PRIVATE_KEY: "", WOMPI_EVENTS_SECRET: "", WOMPI_INTEGRITY_SECRET: "" };
  Object.assign(process.env, efectivo);
  return efectivo;
}
