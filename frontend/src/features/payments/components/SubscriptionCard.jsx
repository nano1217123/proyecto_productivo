"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { paymentsApi } from "../api/paymentsApi";
import { formatearCop, nombrePeriodo } from "../lib/payments";
import { primaryButton } from "../lib/estilos";

// Tarjeta «Mi suscripción» del usuario particular.
// - No muestra estado ni vigencia: el backend todavía no los registra.
// - El importe sale de GET /api/pagos/opciones. Mientras carga, si falla o si
//   el pago no está disponible, la tarjeta sigue ofreciendo la acción y el
//   valor exacto se confirma en /dashboard/pagos antes de pagar.
export default function SubscriptionCard() {
  const [estado, setEstado] = useState({ cargando: true, opcion: null });

  useEffect(() => {
    let cancelado = false;
    paymentsApi
      .getOptions()
      .then((opciones) => {
        if (cancelado) return;
        const opcion =
          opciones?.find((o) => o.plan === "suscripcion_particular" && o.disponible) ?? null;
        setEstado({ cargando: false, opcion });
      })
      .catch(() => !cancelado && setEstado({ cargando: false, opcion: null }));
    return () => {
      cancelado = true;
    };
  }, []);

  const { cargando, opcion } = estado;

  return (
    <article
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 border border-[#41433f] rounded-lg bg-[#212320]"
      aria-labelledby="mi-suscripcion-titulo"
    >
      <div>
        <p className="m-0 mb-2 text-[11px] font-extrabold tracking-[1.8px] uppercase text-[#b56cff]">
          Plan personal · Estado de suscripción sin confirmar
        </p>
        <h2 id="mi-suscripcion-titulo" className="m-0 text-2xl tracking-[-0.5px] text-[#f2f4ef]">
          Mi suscripción
        </h2>
        <p className="m-0 mt-2 text-sm text-[#a9afa7] leading-[1.55]" aria-live="polite">
          {cargando ? (
            "Consultando el valor del plan..."
          ) : opcion ? (
            <>
              <span className="text-[#f2f4ef] font-extrabold">
                {formatearCop(opcion.monto_en_centavos)} {opcion.moneda}
              </span>{" "}
              / {nombrePeriodo(opcion.periodo)}. Lo confirmas antes de pagar.
            </>
          ) : (
            "Verás el valor exacto antes de confirmar el pago."
          )}
        </p>
        <p className="m-0 mt-1 text-xs text-[#a9afa7]">
          El pago se completa en Wompi (ambiente de pruebas).
        </p>
      </div>
      <Link href="/dashboard/pagos" className={`${primaryButton} shrink-0`}>
        Ver planes
      </Link>
    </article>
  );
}
