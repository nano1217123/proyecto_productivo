"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Página de retorno desde Wompi (redirect-url). Wompi añade ?id=<transacción>.
// El retorno NO confirma el pago: la confirmación llegará por webhook al
// backend, así que aquí no se muestra ningún estado como definitivo.
function PaymentResult() {
  const params = useSearchParams();
  const transaccionId = params.get("id");

  return (
    <main className="min-h-screen px-6 bg-[#171817] text-[#f2f4ef] flex items-center justify-center">
      <div className="w-full max-w-[520px] p-7 border border-[#41433f] rounded-lg bg-[#212320]">
        <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">
          PAGOS · SANDBOX
        </p>
        <h1 className="m-0 text-3xl tracking-[-1px]">Pago en verificación</h1>
        <p className="mt-4 text-[#a9afa7] leading-[1.55]">
          Volviste desde Wompi. Estamos esperando su confirmación; tu suscripción
          se actualizará cuando el pago quede aprobado.
        </p>
        {transaccionId && (
          <p className="mt-4 text-sm text-[#a9afa7]">
            Transacción:{" "}
            <span className="font-mono text-xs text-[#c8cbc5] break-all">
              {transaccionId}
            </span>
          </p>
        )}
        <Link
          href="/dashboard"
          className="inline-block mt-6 text-sm font-extrabold text-[#f2f4ef] no-underline hover:text-[#d7adff]"
        >
          Volver al panel &rarr;
        </Link>
      </div>
    </main>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={null}>
      <PaymentResult />
    </Suspense>
  );
}
