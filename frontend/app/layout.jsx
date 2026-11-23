import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/features/auth/context/AuthContext";

export const metadata = {
  title: "Módulo de autenticación",
  description: "Login y registro",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* 👇 El script debe ir en el head */}
        <Script 
          src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" 
          strategy="beforeInteractive" 
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}