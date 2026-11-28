import { NextResponse } from "next/server";
import { dashboardReturnTo } from "./features/auth/returnTo.js";

const API_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const ACCESS_COOKIE = "access_token";

async function verifySession(request) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    // El backend valida la sesión y devuelve el perfil.
    // GET /api/perfil está protegido con requireAuth:
    //   - 200 → sesión válida (devuelve { profile })
    //   - 401 → sin sesión o token inválido
    const res = await fetch(`${API_URL}/api/perfil`, {
      method: "GET",
      headers: { Cookie: `${ACCESS_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile;
  } catch {
    return null;
  }
}

export async function proxy(request) {
  const url = request.nextUrl.clone();
  const user = await verifySession(request);

  // Logueado en /login o /register → /dashboard
  if (user && (url.pathname === "/login" || url.pathname === "/register")) {
    const destination = url.pathname === "/login" && dashboardReturnTo(url.searchParams.get("returnTo"));
    if (destination) return NextResponse.redirect(new URL(destination, request.url));
    url.pathname = "/dashboard";
    url.searchParams.delete("returnTo");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register"],
};
