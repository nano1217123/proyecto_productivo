// Perfil normalizado que devuelve cualquier proveedor OAuth.
export interface OAuthProfile {
  provider: "google" | "microsoft";
  providerId: string;
  email: string;
  nombres: string;
  apellidos: string;
  emailVerified: boolean;
}