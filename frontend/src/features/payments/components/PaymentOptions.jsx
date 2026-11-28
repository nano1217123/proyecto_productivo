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
import { cardClass, focusRing, primaryButton, secondaryButton } from "../lib/estilos";

const claveOpcion = (opcion) => opcion.gym_slug ?? "personal";
const FOCO_CONFIRMACION = Symbol("confirmacion");

// Opciones de pago del usuario autenticado y confirmación previa al checkout.
// La usan la página /dashboard/pagos y la pestaña «Suscripción» del admin.
// El backend decide qué opciones existen (plan del rol y sedes de
// admin_sedes); aquí solo se presentan.
//
// `embedded`: dentro de otra pantalla que ya tiene su <h1>/<h2>, los títulos
// bajan un nivel.
export default function PaymentOptions({ embedded = false }) {
  const { profile, loading } = useAuth();
  const rol = profile?.tipo_usuario;
  const autorizado = puedePagar(rol);
  const Titulo = embedded ? "h3" : "h2";

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

  // Foco: al abrir la confirmación va a su título; al cancelarla vuelve al
  // botón «Continuar» de la opción que se había elegido.
  const tituloConfirmacionRef = useRef(null);
  const botonesContinuarRef = useRef(new Map());
  const focoPendienteRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    const destino = focoPendienteRef.current;
    if (!destino) return;
    focoPendienteRef.current = null;
    if (destino === FOCO_CONFIRMACION) tituloConfirmacionRef.current?.focus();
    else botonesContinuarRef.current.get(destino)?.focus();
  });

  // Los errores se anuncian (role="alert") y se desplazan a la vista: en
  // móvil el botón que los provoca puede quedar lejos del mensaje.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);

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
        // En el mismo render que la lista, para que el foco pueda volver a
        // un botón «Continuar» ya habilitado.
        setCargandoOpciones(false);
        setOpciones(data);
        // Conserva la selección con el importe actualizado, si sigue existiendo.
        setSeleccion((actual) => {
          if (!actual) return null;
          const vigente =
            data.find((o) => claveOpcion(o) === claveOpcion(actual) && o.disponible) ?? null;
          if (!vigente) focoPendienteRef.current = claveOpcion(actual);
          return vigente;
        });
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
    focoPendienteRef.current = FOCO_CONFIRMACION;
    setSeleccion(opcion);
  }

  function cancelar() {
    if (enviandoRef.current || !seleccion) return;
    setError("");
    focoPendienteRef.current = claveOpcion(seleccion);
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

  const avisoError = error && (
    <p
      ref={errorRef}
      role="alert"
      className="m-0 p-3.5 rounded-md border border-[rgba(255,121,121,.42)] bg-[rgba(120,42,42,.18)] text-[#ff9898] text-sm scroll-mb-6"
    >
      {error}
    </p>
  );

  if (loading) return <p className="m-0 text-sm text-[#a9afa7]">Cargando...</p>;

  if (!autorizado) {
    return (
      <div className={cardClass}>
        <p className="m-0 text-[#a9afa7]">
          Tu tipo de cuenta no gestiona pagos de suscripción.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!seleccion && avisoError}

      {seleccion && (
        <section
          className={cardClass}
          aria-labelledby="confirmacion-pago-titulo"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !procesando) {
              e.preventDefault();
              cancelar();
            }
          }}
        >
          <p className="m-0 mb-2 text-[11px] font-extrabold tracking-[1.8px] uppercase text-[#b56cff]">
            Confirma el pago
          </p>
          <Titulo
            id="confirmacion-pago-titulo"
            ref={tituloConfirmacionRef}
            tabIndex={-1}
            className={`m-0 text-2xl rounded-sm ${focusRing}`}
          >
            {nombrePlan(seleccion.plan)}
            {seleccion.gym_slug && ` · ${nombreSede(seleccion.gym_slug)}`}
          </Titulo>

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

          <div className="mt-5 text-xs text-[#a9afa7] leading-[1.55] [&_p]:m-0 flex flex-col gap-2">
            <p>
              Al pulsar «Pagar con Wompi» registraremos el pago y saldrás de JJ GYM
              hacia Wompi. Allí eliges el medio de pago y completas la
              transacción. Al terminar, Wompi te devuelve aquí para ver el
              resultado.
            </p>
            <p>
              JJ GYM no recibe ni guarda los datos de tu tarjeta o cuenta. Si
              pulsas «Cancelar», vuelves a la lista sin registrar ningún pago.
            </p>
          </div>

          {error && <div className="mt-5">{avisoError}</div>}

          <div className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-3">
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
        </section>
      )}

      {!seleccion && cargandoOpciones && opciones.length === 0 && (
        <p className="m-0 text-sm text-[#a9afa7]" role="status">
          Cargando opciones de pago...
        </p>
      )}

      {!seleccion && !cargandoOpciones && !error && opciones.length === 0 && (
        <div className={cardClass}>
          <p className="m-0 text-[#a9afa7]">
            {rol === "admin"
              ? "No tienes sedes asignadas, así que no hay suscripciones de sede para pagar. Pide a un super administrador que te asigne tu sede."
              : "No hay pagos disponibles para tu cuenta."}
          </p>
        </div>
      )}

      {!seleccion &&
        opciones.map((opcion) => {
          const clave = claveOpcion(opcion);
          return (
            <article
              key={clave}
              className={`${cardClass} flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-4`}
            >
              <div>
                <p className="m-0 mb-1.5 text-[11px] font-extrabold tracking-[1.8px] uppercase text-[#b56cff]">
                  {nombrePlan(opcion.plan)}
                </p>
                <Titulo className="m-0 text-xl">
                  {opcion.gym_slug ? nombreSede(opcion.gym_slug) : "Tu cuenta"}
                </Titulo>
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
                ref={(nodo) => {
                  if (nodo) botonesContinuarRef.current.set(clave, nodo);
                  else botonesContinuarRef.current.delete(clave);
                }}
                className={primaryButton}
                disabled={!opcion.disponible || cargandoOpciones}
                onClick={() => elegir(opcion)}
                aria-label={`Continuar con ${nombrePlan(opcion.plan)}${opcion.gym_slug ? ` de ${nombreSede(opcion.gym_slug)}` : ""}`}
              >
                Continuar al pago
              </button>
            </article>
          );
        })}

      {!seleccion && ultimaReferencia && (
        <Link
          href={`/dashboard/pagos/resultado?referencia=${encodeURIComponent(ultimaReferencia)}`}
          className={`self-start text-sm text-[#a9afa7] no-underline hover:text-[#f2f4ef] rounded-sm ${focusRing}`}
        >
          Consultar estado del pago
        </Link>
      )}
    </div>
  );
}
