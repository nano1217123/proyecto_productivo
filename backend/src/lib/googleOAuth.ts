import { randomBytes, createHash } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import type { OAuthProfile } from "../types/oauth.types.js";

// URLs oficiales de Google.
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

// Scopes mínimos: solo email y perfil básico.
const SCOPES = ["openid", "email", "profile"];

// ---------- PKCE ----------

// Genera un code_verifier aleatorio (43-128 chars).
export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

// Genera el code_challenge = SHA256(code_verifier) en base64url.
export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

// Genera un state aleatorio para prevenir CSRF.
export function generateState(): string {
  return randomBytes(16).toString("hex");
}

// ---------- Construcción de la URL de autorización ----------

export function buildAuthorizationUrl(
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ---------- Intercambio de código por tokens ----------

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: env.googleRedirectUri,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("Google token exchange error:", response.status, errBody);
    throw new AppError(401, "No se pudo validar el código con Google.");
  }

  return (await response.json()) as GoogleTokenResponse;
}

// ---------- Obtención del perfil ----------

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
}

async function fetchUserProfile(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error("Google userinfo error:", response.status);
    throw new AppError(401, "No se pudo obtener el perfil de Google.");
  }

  return (await response.json()) as GoogleUserInfo;
}

// ---------- Flujo completo ----------

// Intercambia el código por tokens y devuelve el perfil normalizado.
export async function getGoogleProfile(
  code: string,
  codeVerifier: string
): Promise<OAuthProfile> {
  const tokens = await exchangeCodeForTokens(code, codeVerifier);
  const info = await fetchUserProfile(tokens.access_token);

  if (!info.email) {
    throw new AppError(400, "Google no devolvió un correo.");
  }

  // Si Google no manda given_name/family_name, derivamos del name.
  let nombres = info.given_name ?? "";
  let apellidos = info.family_name ?? "";

  if (!nombres && info.name) {
    const partes = info.name.split(" ");
    nombres = partes[0] ?? "";
    apellidos = partes.slice(1).join(" ") || "";
  }

  return {
    provider: "google",
    providerId: info.id,
    email: info.email.toLowerCase(),
    nombres: nombres || "Usuario",
    apellidos: apellidos || "Google",
    emailVerified: info.verified_email === true,
  };
}