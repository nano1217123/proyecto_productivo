"use client";

import PaymentOptions from "../components/PaymentOptions";

export default function PaymentsPage() {
  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817] text-[#f2f4ef]">

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
