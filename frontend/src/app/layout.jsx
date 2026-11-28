import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/src/features/auth/context/AuthContext";

export const metadata = {
  title: { default: "J&J GYM", template: "%s | J&J GYM" },
  description: "Organiza tus rutinas, registra tus entrenamientos y consulta tu progreso con J&J GYM.",
  applicationName: "J&J GYM",
  icons: { icon: { url: "/landing/icon.svg", type: "image/svg+xml" } },
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
