import { randomBytes, createHash } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import type { OAuthProfile } from "../types/oauth.types.js";

// URLs oficiales de Microsoft Entra ID (antes Azure AD).
const MICROSOFT_AUTH_URL = `https://login.microsoftonline.com/${env.microsoftTenantId}/oauth2/v2.0/authorize`;
const MICROSOFT_TOKEN_URL = `https://login.microsoftonline.com/${env.microsoftTenantId}/oauth2/v2.0/token`;
const MICROSOFT_GRAPH_URL = "https://graph.microsoft.com/v1.0/me";

// Scopes mínimos: openid, email, profile y offline_access (aunque no usemos refresh token de MS).
const SCOPES = ["openid", "email", "profile", "User.Read"];

// ---------- PKCE ----------
export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function generateState(): string {
  return randomBytes(16).toString("hex");
}

// ---------- Construcción de la URL de autorización ----------
export function buildAuthorizationUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: env.microsoftClientId,
    response_type: "code",
    redirect_uri: env.microsoftRedirectUri,
    response_mode: "query",
    scope: SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account", // Fuerza a elegir cuenta si ya hay sesión
  });

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

// ---------- Intercambio de código por tokens ----------
interface MicrosoftTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<MicrosoftTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.microsoftClientId,
    client_secret: env.microsoftClientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: env.microsoftRedirectUri,
  });

  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("Microsoft token exchange error:", response.status, errBody);
    throw new AppError(401, "No se pudo validar el código con Microsoft.");
  }

  return (await response.json()) as MicrosoftTokenResponse;
}

// ---------- Obtención del perfil ----------
interface MicrosoftUserInfo {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  userPrincipalName?: string;
}

// Decodifica el payload de un JWT sin verificar la firma
// (Microsoft ya lo firmó y lo recibimos por HTTPS del endpoint de tokens).
function decodeIdToken(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return {};
  }
}

async function fetchUserProfile(
  accessToken: string,
  idToken: string
): Promise<OAuthProfile> {
  const response = await fetch(MICROSOFT_GRAPH_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let graphData: MicrosoftUserInfo | null = null;
  if (response.ok) {
    graphData = (await response.json()) as MicrosoftUserInfo;
  }

  // El email puede venir en el id_token (más confiable) o en Graph.
  const idTokenData = decodeIdToken(idToken);
  const email =
    (idTokenData.email as string) ||
    (idTokenData.preferred_username as string) ||
    graphData?.mail ||
    graphData?.userPrincipalName ||
    "";

  if (!email) {
    throw new AppError(400, "Microsoft no devolvió un correo.");
  }

  const nombres = graphData?.givenName || (idTokenData.given_name as string) || "";
  const apellidos = graphData?.surname || (idTokenData.family_name as string) || "";
  const displayName = graphData?.displayName || (idTokenData.name as string) || "";

  let finalNombres = nombres;
  let finalApellidos = apellidos;

  if (!finalNombres && displayName) {
    const partes = displayName.split(" ");
    finalNombres = partes[0] ?? "";
    finalApellidos = partes.slice(1).join(" ") || "";
  }

  return {
    provider: "microsoft",
    providerId: graphData?.id || (idTokenData.oid as string) || "",
    email: email.toLowerCase(),
    nombres: finalNombres || "Usuario",
    apellidos: finalApellidos || "Microsoft",
    // Microsoft verifica los correos de sus cuentas por defecto.
    emailVerified: true,
  };
}

// ---------- Flujo completo ----------
export async function getMicrosoftProfile(
  code: string,
  codeVerifier: string
): Promise<OAuthProfile> {
  const tokens = await exchangeCodeForTokens(code, codeVerifier);
  return fetchUserProfile(tokens.access_token, tokens.id_token);
}