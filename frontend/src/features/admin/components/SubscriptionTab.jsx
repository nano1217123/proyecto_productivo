"use client";

import PaymentOptions from "@/src/features/payments/components/PaymentOptions";

// Pestaña «Suscripción» del admin de sede. Reutiliza el flujo de pagos:
// GET /api/pagos/opciones devuelve una opción por cada sede de admin_sedes,
// y el pago se confirma antes de crear el intento y salir hacia Wompi.
// Solo se monta para tipo_usuario "admin"; el backend vuelve a comprobarlo.
export default function SubscriptionTab() {
  return (
    <section aria-labelledby="suscripcion-sede-titulo" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="suscripcion-sede-titulo" className="m-0 text-2xl tracking-[-0.5px] text-[#f2f4ef]">
            Suscripción de tus sedes
          </h2>
          <p className="m-0 mt-2 max-w-[560px] text-sm text-[#a9afa7] leading-[1.55]">
            Paga la suscripción mensual de cada sede que administras. Revisas el
            valor antes de confirmar y el pago se completa en Wompi.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded border border-[rgba(255,196,87,.45)] bg-[rgba(120,86,20,.2)] text-[#ffcf70] text-[11px] font-extrabold tracking-widest">
          SANDBOX
        </span>
      </div>
      <PaymentOptions embedded />
    </section>
  );
}
