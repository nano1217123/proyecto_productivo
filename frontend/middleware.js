import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const ACCESS_COOKIE = "access_token";

async function verifySession(request) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    // El middleware corre en Edge Runtime y NO puede verificar el JWT
    // con JWT_SECRET sin exponerlo. Delegamos al backend.
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

export async function middleware(request) {
  const url = request.nextUrl.clone();
  const user = await verifySession(request);

  // Ruta protegida sin sesión → /login
  if (!user && url.pathname.startsWith("/dashboard")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logueado en /login o /register → /dashboard
  if (user && (url.pathname === "/login" || url.pathname === "/register")) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};