"use client";

import Link from "next/link";
import PaymentOptions from "../components/PaymentOptions";

export default function PaymentsPage() {
  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817] text-[#f2f4ef]">
      <header className="w-full max-w-[760px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Link
          href="/dashboard"
          className="text-[#a9afa7] text-sm no-underline hover:text-[#f2f4ef] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]"
        >
          &larr; Volver al panel
        </Link>
        <span className="px-2.5 py-1 rounded border border-[rgba(255,196,87,.45)] bg-[rgba(120,86,20,.2)] text-[#ffcf70] text-[11px] font-extrabold tracking-widest">
          SANDBOX
        </span>
      </header>

      <section className="w-full max-w-[760px] mx-auto pt-[56px] pb-[28px]">
        <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">
          PAGOS
        </p>
        <h1 className="m-0 text-[clamp(32px,5vw,48px)] tracking-[-1.5px] leading-none">
          Pagar suscripción
        </h1>
        <p className="mt-4 max-w-[520px] text-[#a9afa7] leading-[1.55]">
          Elige el plan, revisa el valor y confírmalo. El pago se completa en
          Wompi. Estás en el ambiente de pruebas: no se realizan cobros reales.
        </p>
      </section>

      <section className="w-full max-w-[760px] mx-auto" aria-label="Opciones de pago">
        <PaymentOptions />
      </section>
    </main>
  );
}
