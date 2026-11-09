"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // El callback de OAuth ahora lo maneja el backend.
    // Esta página solo redirige al dashboard o al login.
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]">
      <p className="text-sm text-[#a9afa7]">Redirigiendo...</p>
    </div>
  );
}