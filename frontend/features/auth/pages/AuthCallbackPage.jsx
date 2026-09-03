"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function AuthCallbackPage() {
  const { session, loading } = useAuth(); const router = useRouter();
  useEffect(() => {
    if (loading) return;
    const destination = window.sessionStorage.getItem("postLoginDestination") || "/dashboard";
    window.sessionStorage.removeItem("postLoginDestination");
    router.replace(session ? destination : "/login");
  }, [loading, session, router]);
  return <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]"><div className="w-full max-w-[410px] p-[38px_34px_32px] border border-[#383c35] rounded-[18px] bg-[rgba(28,30,27,0.95)] shadow-[0_22px_54px_rgba(0,0,0,0.42)]"><h1 className="m-0 mb-2 text-[27px] font-bold tracking-[-0.7px]">Conectando...</h1><p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">Estamos validando tu sesión de Google.</p></div></div>;
}
