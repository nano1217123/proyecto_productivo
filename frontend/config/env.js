/**
 * Configuración centralizada del entorno.
 *
 * Única fuente de verdad para variables de entorno del frontend.
 * Evita repetir `process.env.NEXT_PUBLIC_API_URL` en múltiples archivos
 * y previene bugs por falta de fallback.
 *
 * Solo usar en código cliente/servidor de Next.js (no en middleware Edge
 * si la variable no está disponible allí — verificar caso por caso).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const env = {
  apiUrl: API_URL,
};

export default env;
