"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { paymentsApi } from "../api/paymentsApi";
import {
  esUrlCheckoutWompi,
  formatearCop,
  formatearTasa,
  formatearUsd,
  nombrePeriodo,
  nombrePlan,
  nombreSede,
  puedePagar,
} from "../lib/payments";

const cardClass =
  "p-6 border border-[#41433f] rounded-lg bg-[#212320] text-[#f2f4ef]";
const primaryButton =
  "inline-flex items-center justify-center px-5 py-3 rounded-md border-0 bg-[#b56cff] text-white text-sm font-extrabold cursor-pointer hover:bg-[#a457f2] disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButton =
  "inline-flex items-center justify-center px-5 py-3 rounded-md border border-[#41433f] bg-transparent text-[#a9afa7] text-sm font-bold cursor-pointer hover:text-[#f2f4ef] hover:border-[#6f756b]";

export default function PaymentsPage() {
  const { profile, loading } = useAuth();
  const rol = profile?.tipo_usuario;
  const autorizado = puedePagar(rol);

  const [opciones, setOpciones] = useState([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(false);
  const [error, setError] = useState("");
  const [iniciando, setIniciando] = useState(null);
  const [checkout, setCheckout] = useState(null);

  useEffect(() => {
    if (loading || !autorizado) return;
    let cancelado = false;

    setCargandoOpciones(true);
    paymentsApi
      .getOptions()
      .then((data) => !cancelado && setOpciones(data))
      .catch((err) => !cancelado && setError(err.message))
      .finally(() => !cancelado && setCargandoOpciones(false));

    return () => {
      cancelado = true;
    };
  }, [loading, autorizado]);

  async function iniciarPago(opcion) {
    setError("");
    setIniciando(opcion.gym_slug ?? "personal");
    try {
      const data = await paymentsApi.startWompiCheckout({
        gymSlug: opcion.gym_slug,
      });
      setCheckout(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIniciando(null);
    }
  }

  function irAWompi() {
    if (!checkout || !esUrlCheckoutWompi(checkout.checkoutUrl)) {
      setError("La dirección de pago no es válida. Intenta de nuevo.");
      return;
    }
    window.location.assign(checkout.checkoutUrl);
  }

  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817] text-[#f2f4ef]">
      <header className="w-full max-w-[760px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Link
          href="/dashboard"
          className="text-[#a9afa7] text-sm no-underline hover:text-[#f2f4ef]"
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
          El pago se procesa en Wompi. Estás en el ambiente de pruebas: no se
          realizan cobros reales.
        </p>
      </section>

      <section className="w-full max-w-[760px] mx-auto flex flex-col gap-4">
        {loading && <p className="text-sm text-[#a9afa7]">Cargando...</p>}

        {!loading && !autorizado && (
          <div className={cardClass}>
            <p className="m-0 text-[#a9afa7]">
              Tu tipo de cuenta no gestiona pagos de suscripción.
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="m-0 p-3.5 rounded-md border border-[rgba(255,121,121,.42)] bg-[rgba(120,42,42,.18)] text-[#ff9898] text-sm"
          >
            {error}
          </p>
        )}

        {autorizado && checkout && (
          <div className={cardClass} aria-live="polite">
            <p className="m-0 mb-2 text-[11px] font-extrabold tracking-[1.8px] uppercase text-[#b56cff]">
              Confirma el pago
            </p>
            <h2 className="m-0 text-2xl">
              {nombrePlan(checkout.pago.plan)}
              {checkout.pago.gym_slug && ` · ${nombreSede(checkout.pago.gym_slug)}`}
            </h2>
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-[#a9afa7]">Valor a pagar</dt>
              <dd className="m-0 text-xl font-extrabold">
                {formatearCop(checkout.pago.monto_en_centavos)} {checkout.pago.moneda}
              </dd>
              {checkout.pago.precio_usd_centavos != null && (
                <>
                  <dt className="text-[#a9afa7]">Precio del plan</dt>
                  <dd className="m-0 text-[#c8cbc5]">
                    {formatearUsd(checkout.pago.precio_usd_centavos)} /{" "}
                    {nombrePeriodo(checkout.pago.periodo)}
                  </dd>
                  <dt className="text-[#a9afa7]">Tasa de prueba</dt>
                  <dd className="m-0 text-[#c8cbc5]">
                    1 USD = {formatearTasa(checkout.pago.tasa_usd_cop)} COP
                  </dd>
                </>
              )}
              <dt className="text-[#a9afa7]">Referencia</dt>
              <dd className="m-0 font-mono text-xs break-all text-[#c8cbc5]">
                {checkout.pago.referencia}
              </dd>
            </dl>
            <p className="mt-4 text-xs text-[#a9afa7]">
              Serás redirigido a Wompi para completar el pago.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className={primaryButton} onClick={irAWompi}>
                Continuar a Wompi
              </button>
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setCheckout(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {autorizado && !checkout && cargandoOpciones && (
          <p className="text-sm text-[#a9afa7]">Cargando opciones de pago...</p>
        )}

        {autorizado && !checkout && !cargandoOpciones && !error && opciones.length === 0 && (
          <div className={cardClass}>
            <p className="m-0 text-[#a9afa7]">
              {rol === "admin"
                ? "No tienes sedes asignadas. Solicita la asignación al equipo administrador."
                : "No hay pagos disponibles para tu cuenta."}
            </p>
          </div>
        )}

        {autorizado &&
          !checkout &&
          opciones.map((opcion) => {
            const clave = opcion.gym_slug ?? "personal";
            return (
              <article
                key={clave}
                className={`${cardClass} flex flex-wrap items-center justify-between gap-4`}
              >
                <div>
                  <p className="m-0 mb-1.5 text-[11px] font-extrabold tracking-[1.8px] uppercase text-[#b56cff]">
                    {nombrePlan(opcion.plan)}
                  </p>
                  <h2 className="m-0 text-xl">
                    {opcion.gym_slug ? nombreSede(opcion.gym_slug) : "Tu cuenta"}
                  </h2>
                  <p className="m-0 mt-1.5 text-sm text-[#c8cbc5]">
                    {formatearUsd(opcion.precio_usd_centavos)} /{" "}
                    {nombrePeriodo(opcion.periodo)}
                    {opcion.disponible &&
                      ` · ${formatearCop(opcion.monto_en_centavos)} ${opcion.moneda}`}
                  </p>
                  <p className="m-0 mt-1 text-xs text-[#a9afa7]">
                    {opcion.disponible
                      ? `Tasa de prueba: 1 USD = ${formatearTasa(opcion.tasa_usd_cop)} COP`
                      : opcion.motivo_no_disponible || "Pago no disponible en este momento."}
                  </p>
                </div>
                <button
                  type="button"
                  className={primaryButton}
                  disabled={!opcion.disponible || iniciando !== null}
                  onClick={() => iniciarPago(opcion)}
                >
                  {iniciando === clave ? "Preparando..." : "Pagar"}
                </button>
              </article>
            );
          })}
      </section>
    </main>
  );
}
