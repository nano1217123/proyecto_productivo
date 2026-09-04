import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/features/auth/context/AuthContext";

export const metadata = {
  title: "Módulo de autenticación",
  description: "Ejemplo de login con Next.js y Node.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" strategy="beforeInteractive" />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
