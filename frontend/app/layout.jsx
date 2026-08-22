import "./globals.css";
import { AuthProvider } from "@/features/auth/context/AuthContext";

export const metadata = {
  title: "Módulo de autenticación",
  description: "Ejemplo de login con Next.js y Node.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
