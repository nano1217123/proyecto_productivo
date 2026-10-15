import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || ""
);

const ACCESS_COOKIE = "access_token";

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  const response = NextResponse.next();

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const user = token ? await verifyToken(token) : null;

  const url = request.nextUrl.clone();

  if (!user && url.pathname.startsWith("/dashboard")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (url.pathname === "/login" || url.pathname === "/register")) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};