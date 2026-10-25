import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const ACCESS_COOKIE = "access_token";

async function verifySession(request) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    // Delegamos la verificación al backend (que sí tiene el JWT_SECRET)
    const res = await fetch(`${API_URL}/api/perfil`, {
      method: "GET",
      headers: { Cookie: `${ACCESS_COOKIE}=${token}` },
      cache: "no-store",
    });
    
    if (!res.ok) return null;
    
    // El backend devuelve { profile: { ..., tipo_usuario } }
    const data = await res.json();
    return data.profile; 
  } catch {
    return null;
  }
}

export async function middleware(request) {
  const url = request.nextUrl.clone();
  const user = await verifySession(request);

  // 1. Si no hay sesión y quiere ir a /dashboard, lo mandamos al login
  if (!user && url.pathname.startsWith("/dashboard")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2. Si hay sesión, verificamos los roles
  if (user) {
    const isAdmin = user.tipo_usuario === "admin" || user.tipo_usuario === "super_admin";
    
    // Si es admin y quiere entrar a rutas de cliente (ejercicios, rutinas, etc.)
    if (isAdmin && url.pathname.startsWith("/dashboard") && !url.pathname.startsWith("/dashboard/admin")) {
      url.pathname = "/dashboard/admin";
      return NextResponse.redirect(url);
    }

    // Si es cliente y quiere entrar a rutas de admin
    if (!isAdmin && url.pathname.startsWith("/dashboard/admin")) {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Si ya está logueado y quiere ir a /login o /register, lo mandamos a su panel
    if (url.pathname === "/login" || url.pathname === "/register") {
      url.pathname = isAdmin ? "/dashboard/admin" : "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};