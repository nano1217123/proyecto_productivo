"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import VerifyOtpPage from "@/features/auth/views/VerifyOtpPage";

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  return <VerifyOtpPage email={email} />;
}

export default function VerifyOtpRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]"><p className="text-sm text-[#a9afa7]">Cargando...</p></div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
