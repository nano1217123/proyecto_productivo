import "dotenv/config";

// Devuelve el valor de una variable obligatoria o detiene el arranque
// con un mensaje claro si no existe.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name} en .env`);
  }
  return value;
}

// TRUST_PROXY acepta "false", un número de saltos (ej. "1") o un texto
// (ej. "loopback"), tal como lo acepta Express en "trust proxy".
function parseTrustProxy(raw: string): boolean | number | string {
  if (raw === "false") return false;
  const asNumber = Number(raw);
  return Number.isNaN(asNumber) ? raw : asNumber;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const clientOrigin = process.env.CLIENT_ORIGIN;

if (nodeEnv === "production" && !clientOrigin) {
  throw new Error(
    "ERROR CRÍTICO: La variable de entorno CLIENT_ORIGIN no está definida para producción."
  );
}

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: Number(process.env.PORT) || 4000,
  clientOrigin: clientOrigin || "http://localhost:3000",
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY ?? "1"),
  databaseUrl: required("DATABASE_URL"),    
  directUrl: required("DIRECT_URL"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseSecretKey: required("SUPABASE_SECRET_KEY"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d",
} as const;