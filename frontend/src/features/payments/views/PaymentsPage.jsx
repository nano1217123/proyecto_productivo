"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { HttpError } from "@/src/lib/api/httpClient";
import { paymentsApi } from "../api/paymentsApi";
import {
  esUrlCheckoutWompi,
  formatearCop,
  formatearTasa,
  formatearUsd,
  guardarUltimaReferencia,
  leerUltimaReferencia,
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
  "inline-flex items-center justify-center px-5 py-3 rounded-md border border-[#41433f] bg-transparent text-[#a9afa7] text-sm font-bold cursor-pointer hover:text-[#f2f4ef] hover:border-[#6f756b] disabled:opacity-50 disabled:cursor-not-allowed";

const claveOpcion = (opcion) => opcion.gym_slug ?? "personal";

export default function PaymentsPage() {
  const { profile, loading } = useAuth();
  const rol = profile?.tipo_usuario;
  const autorizado = puedePagar(rol);

  const [opciones, setOpciones] = useState([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(false);
  const [recargas, setRecargas] = useState(0);
  const [error, setError] = useState("");
  // Opción elegida: se muestra el importe para confirmar. Todavía no existe
  // ningún intento de pago; Cancelar solo vuelve a la lista.
  const [seleccion, setSeleccion] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [ultimaReferencia, setUltimaReferencia] = useState(null);
  // Bloqueo síncrono contra dobles clics: el estado de React se aplica en
  // el siguiente render; el ref, de inmediato.
  const enviandoRef = useRef(false);

  useEffect(() => {
    setUltimaReferencia(leerUltimaReferencia());

    // Al volver desde Wompi con «Atrás», el navegador puede restaurar la
    // página desde su caché (bfcache) con el botón aún bloqueado.
    function alRestaurar(evento) {
      if (!evento.persisted) return;
      enviandoRef.current = false;
      setProcesando(false);
      setUltimaReferencia(leerUltimaReferencia());
    }
    window.addEventListener("pageshow", alRestaurar);
    return () => window.removeEventListener("pageshow", alRestaurar);
  }, []);

  useEffect(() => {
    if (loading || !autorizado) return;
    let cancelado = false;

    setCargandoOpciones(true);
    paymentsApi
      .getOptions()
      .then((data) => {
        if (cancelado) return;
        setOpciones(data);
        // Conserva la selección con el importe actualizado, si sigue existiendo.
        setSeleccion((actual) =>
          actual
            ? data.find((o) => claveOpcion(o) === claveOpcion(actual) && o.disponible) ?? null
            : null
        );
      })
      .catch((err) => !cancelado && setError(err.message))
      .finally(() => !cancelado && setCargandoOpciones(false));

    return () => {
      cancelado = true;
    };
  }, [loading, autorizado, recargas]);

  function elegir(opcion) {
    if (!opcion.disponible || procesando) return;
    setError("");
    setSeleccion(opcion);
  }

  function cancelar() {
    if (enviandoRef.current) return;
    setError("");
    setSeleccion(null);
  }

  // Único punto que crea el intento: el botón final «Pagar con Wompi».
  async function pagarConWompi() {
    if (enviandoRef.current || !seleccion?.disponible) return;
    enviandoRef.current = true;
    setProcesando(true);
    setError("");

    try {
      const { pago, checkoutUrl } = await paymentsApi.startWompiCheckout({
        gymSlug: seleccion.gym_slug,
        montoEnCentavos: seleccion.monto_en_centavos,
      });
      if (
        !esUrlCheckoutWompi(checkoutUrl) ||
        pago?.monto_en_centavos !== seleccion.monto_en_centavos
      ) {
        throw new Error("No se pudo preparar el pago. Intenta de nuevo.");
      }
      guardarUltimaReferencia(pago.referencia);
      // El bloqueo se mantiene: el navegador ya está saliendo hacia Wompi.
      window.location.assign(checkoutUrl);
    } catch (err) {
      enviandoRef.current = false;
      setProcesando(false);
      setError(err.message);
      // El importe cambió: se recargan las opciones para mostrar el nuevo
      // valor antes de que el usuario vuelva a confirmar.
      if (err instanceof HttpError && err.status === 409) {
        setRecargas((n) => n + 1);
      }
    }
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

        {autorizado && seleccion && (
          <div className={cardClass} aria-live="polite">
            <p className="m-0 mb-2 text-[11px] font-extrabold tracking-[1.8px] uppercase text-[#b56cff]">
              Confirma el pago
            </p>
            <h2 className="m-0 text-2xl">
              {nombrePlan(seleccion.plan)}
              {seleccion.gym_slug && ` · ${nombreSede(seleccion.gym_slug)}`}
            </h2>

            <p className="m-0 mt-5 text-sm text-[#a9afa7]">Valor a pagar</p>
            <p className="m-0 mt-1 text-[clamp(30px,5vw,40px)] font-extrabold tracking-[-1px] leading-none">
              {formatearCop(seleccion.monto_en_centavos)}{" "}
              <span className="text-base font-bold text-[#a9afa7]">
                {seleccion.moneda}
              </span>
            </p>

            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-[#a9afa7]">Periodo</dt>
              <dd className="m-0 text-[#c8cbc5] capitalize">{seleccion.periodo}</dd>
              <dt className="text-[#a9afa7]">Precio del plan</dt>
              <dd className="m-0 text-[#c8cbc5]">
                {formatearUsd(seleccion.precio_usd_centavos)} /{" "}
                {nombrePeriodo(seleccion.periodo)}
              </dd>
              <dt className="text-[#a9afa7]">Tasa de prueba</dt>
              <dd className="m-0 text-[#c8cbc5]">
                1 USD = {formatearTasa(seleccion.tasa_usd_cop)} COP
              </dd>
            </dl>

            <p className="mt-5 text-xs text-[#a9afa7] leading-[1.5]">
              Al pulsar «Pagar con Wompi» registraremos el pago y te llevaremos a
              Wompi para completarlo. JJ GYM no recibe ni guarda los datos de tu
              tarjeta o cuenta.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className={primaryButton}
                onClick={pagarConWompi}
                disabled={procesando || cargandoOpciones}
                aria-busy={procesando}
              >
                {procesando ? "Conectando con Wompi..." : "Pagar con Wompi"}
              </button>
              <button
                type="button"
                className={secondaryButton}
                onClick={cancelar}
                disabled={procesando}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {autorizado && !seleccion && cargandoOpciones && (
          <p className="text-sm text-[#a9afa7]">Cargando opciones de pago...</p>
        )}

        {autorizado && !seleccion && !cargandoOpciones && !error && opciones.length === 0 && (
          <div className={cardClass}>
            <p className="m-0 text-[#a9afa7]">
              {rol === "admin"
                ? "No tienes sedes asignadas. Solicita la asignación al equipo administrador."
                : "No hay pagos disponibles para tu cuenta."}
            </p>
          </div>
        )}

        {autorizado &&
          !seleccion &&
          opciones.map((opcion) => (
            <article
              key={claveOpcion(opcion)}
              className={`${cardClass} flex flex-wrap items-center justify-between gap-4`}
            >
              <div>
                <p className="m-0 mb-1.5 text-[11px] font-extrabold tracking-[1.8px] uppercase text-[#b56cff]">
                  {nombrePlan(opcion.plan)}
                </p>
                <h2 className="m-0 text-xl">
                  {opcion.gym_slug ? nombreSede(opcion.gym_slug) : "Tu cuenta"}
                </h2>
                {opcion.disponible ? (
                  <p className="m-0 mt-2 text-2xl font-extrabold">
                    {formatearCop(opcion.monto_en_centavos)}{" "}
                    <span className="text-sm font-bold text-[#a9afa7]">
                      {opcion.moneda} / {nombrePeriodo(opcion.periodo)}
                    </span>
                  </p>
                ) : (
                  <p className="m-0 mt-1.5 text-sm text-[#c8cbc5]">
                    {formatearUsd(opcion.precio_usd_centavos)} /{" "}
                    {nombrePeriodo(opcion.periodo)}
                  </p>
                )}
                <p className="m-0 mt-1 text-xs text-[#a9afa7]">
                  {opcion.disponible
                    ? `${formatearUsd(opcion.precio_usd_centavos)} · tasa de prueba 1 USD = ${formatearTasa(opcion.tasa_usd_cop)} COP`
                    : opcion.motivo_no_disponible || "Pago no disponible en este momento."}
                </p>
              </div>
              <button
                type="button"
                className={primaryButton}
                disabled={!opcion.disponible || cargandoOpciones}
                onClick={() => elegir(opcion)}
              >
                Continuar
              </button>
            </article>
          ))}

        {autorizado && !seleccion && ultimaReferencia && (
          <Link
            href={`/dashboard/pagos/resultado?referencia=${encodeURIComponent(ultimaReferencia)}`}
            className="self-start text-sm text-[#a9afa7] no-underline hover:text-[#f2f4ef]"
          >
            ¿Ya pagaste? Ver el estado de tu último pago &rarr;
          </Link>
        )}
      </section>
    </main>
  );
}
