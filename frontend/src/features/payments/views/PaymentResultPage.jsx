"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HttpError } from "@/src/lib/api/httpClient";
import { paymentsApi } from "../api/paymentsApi";
import {
  ESTADOS_PAGO,
  esReferenciaValida,
  estadoSuscripcion,
  formatearCop,
  formatearFechaColombia,
  leerUltimaReferencia,
  nombrePlan,
  nombreSede,
} from "../lib/payments";

// Texto sobre la vigencia de la sede, solo con datos que confirmó el backend.
function textoVigenciaSede(pago) {
  const sede = nombreSede(pago.gym_slug);
  const periodo = pago.suscripcion?.periodo_pago;
  if (pago.estado === "APROBADO" && periodo) {
    const accion = periodo.tipo === "renovacion" ? "se renovó" : "quedó activa";
    // Sin punto final: la fecha puede terminar en «p. m.».
    return `La suscripción de ${sede} ${accion} y está vigente hasta el ${formatearFechaColombia(pago.suscripcion.vigente_hasta)}`;
  }
  if (pago.estado === "PENDIENTE") {
    return `La vigencia de ${sede} no cambia hasta que Wompi confirme el pago.`;
  }
  if (["RECHAZADO", "ERROR"].includes(pago.estado)) {
    return `La vigencia de ${sede} no cambió.`;
  }
  return null;
}

// Página de retorno desde Wompi. Identifica el intento con:
//   1. ?referencia=<ref> (el backend la añade a redirect-url),
//   2. ?id=<transacción> (lo añade Wompi; sirve cuando el webhook ya la
//      registró),
//   3. la última referencia guardada en esta pestaña antes de ir a Wompi.
// El estado mostrado siempre viene del backend (lo actualiza el webhook).
//
// Consultas automáticas: mientras el intento esté PENDIENTE, RECHAZADO o
// ERROR se vuelve a consultar el estado y, si hay referencia, se pide al
// backend que lo verifique con Wompi (conciliación): por si el aviso del
// webhook no llegó, o por si el pagador reintentó y Wompi aprobó otra
// transacción con la misma referencia.
//
// Esas consultas solo ocurren dentro de una ventana fija anclada a la
// creación del intento (`creado_en`, guardado en el servidor), así que
// recargar la página o abrirla en otra pestaña no la reinicia. Wompi no
// expone a la página cuándo empezó el checkout (la hora de la transacción
// solo se puede leer desde el backend con la llave privada), y `creado_en`
// es el momento en que el usuario pulsó «Pagar con Wompi», justo antes de
// ir al checkout. La ventana cubre el tiempo de pagar más los 3 minutos que
// Wompi da para reintentar tras un rechazo. Fuera de ella solo se lee el
// estado una vez y se ofrece «Consultar de nuevo».

const INTERVALO_INICIAL_MS = 3000;
const INTERVALO_LENTO_MS = 6000;
const PASO_A_LENTO_MS = 30_000;
const VENTANA_AUTOMATICA_MS = 15 * 60_000;
const MAX_ERRORES_SEGUIDOS = 3;
// Primera conciliación tras dar unos segundos al webhook; luego, cada 20 s
// (el backend tampoco consulta a Wompi más a menudo por intento).
const PRIMERA_CONCILIACION_MS = 5000;
const CONCILIAR_CADA_MS = 20_000;
// Estados que pueden cambiar todavía y que se pueden conciliar.
const ESTADOS_ABIERTOS = ["PENDIENTE", "RECHAZADO", "ERROR"];

// Ancla de la ventana: `creado_en` del intento. Si aún no se conoce (se busca
// solo por id y el webhook no lo registró), la primera vez que esta pestaña
// lo consultó, guardada en sessionStorage para que recargar no la reinicie.
function anclaVentana(pago, transaccionId) {
  const creado = pago ? Date.parse(pago.creado_en) : NaN;
  if (Number.isFinite(creado)) return creado;
  const clave = `jjgym:pagos:ancla:${transaccionId ?? "sin-id"}`;
  try {
    const guardada = Number(sessionStorage.getItem(clave));
    if (Number.isFinite(guardada) && guardada > 0) return guardada;
    const ahora = Date.now();
    sessionStorage.setItem(clave, String(ahora));
    return ahora;
  } catch {
    return Date.now();
  }
}

const TONOS = {
  pendiente: "border-[rgba(255,196,87,.45)] bg-[rgba(120,86,20,.2)] text-[#ffcf70]",
  exito: "border-[rgba(91,212,143,.45)] bg-[rgba(38,112,69,.18)] text-[#75dfa2]",
  error: "border-[rgba(255,121,121,.42)] bg-[rgba(120,42,42,.18)] text-[#ff9898]",
};

const ETIQUETAS = {
  PENDIENTE: "Pendiente",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  ANULADO: "Anulado",
  ERROR: "Error",
};

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

function leerIdentificador(params) {
  const referencia = params.get("referencia");
  const transaccionId = params.get("id");
  return {
    referencia: esReferenciaValida(referencia) ? referencia : null,
    transaccionId: esReferenciaValida(transaccionId) ? transaccionId : null,
  };
}

function PaymentResult() {
  const params = useSearchParams();
  const router = useRouter();
  const desdeUrl = leerIdentificador(params);
  const referencia = desdeUrl.referencia;
  const transaccionId = desdeUrl.referencia ? null : desdeUrl.transaccionId;

  // "resolviendo" → buscando un identificador en la URL o la pestaña.
  const [fase, setFase] = useState("resolviendo");
  const [pago, setPago] = useState(null);
  const [error, setError] = useState(null); // { tipo, mensaje }
  const [ronda, setRonda] = useState(0);
  const inicioRef = useRef(0);
  // Zona del estado: recibe el foco al pulsar «Consultar de nuevo», porque
  // ese botón puede desaparecer mientras se consulta.
  const estadoRef = useRef(null);
  // true cuando la ronda la pidió el usuario con «Consultar de nuevo».
  const manualRef = useRef(false);

  // Sin referencia ni id en la URL: se usa la guardada en esta pestaña y se
  // escribe en la URL para que recargar la página siga funcionando.
  useEffect(() => {
    if (referencia || transaccionId) {
      setFase("consultando");
      return;
    }
    const guardada = leerUltimaReferencia();
    if (guardada) {
      router.replace(
        `/dashboard/pagos/resultado?referencia=${encodeURIComponent(guardada)}`,
        { scroll: false }
      );
      return;
    }
    setFase("sin-referencia");
  }, [referencia, transaccionId, router]);

  // Consulta el estado; repite mientras siga abierto y dentro de la ventana.
  useEffect(() => {
    if (fase !== "consultando") return;
    const controlador = new AbortController();
    let temporizador = null;
    let erroresSeguidos = 0;
    // Una ronda manual concilia en su primera consulta, aunque la ventana
    // automática ya haya terminado.
    let forzar = manualRef.current;
    manualRef.current = false;
    inicioRef.current = Date.now();
    let ultimaConciliacion = inicioRef.current - CONCILIAR_CADA_MS + PRIMERA_CONCILIACION_MS;
    let ancla = null;

    // Verificación con Wompi a través del backend. Sus fallos (429, 502...)
    // no detienen la consulta normal del estado.
    async function conciliar() {
      ultimaConciliacion = Date.now();
      try {
        const { pago: conciliado } = await paymentsApi.reconcilePayment(referencia, {
          signal: controlador.signal,
        });
        return conciliado ?? null;
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        return null;
      }
    }

    const dentroDeVentana = () => Date.now() < ancla + VENTANA_AUTOMATICA_MS;

    async function consultar() {
      const manual = forzar;
      forzar = false;
      try {
        let actual = await paymentsApi.getPaymentStatus(
          { referencia, transaccionId },
          { signal: controlador.signal }
        );
        ancla = anclaVentana(actual, transaccionId);
        if (
          ESTADOS_ABIERTOS.includes(actual.estado) &&
          referencia &&
          (manual ||
            (dentroDeVentana() && Date.now() - ultimaConciliacion >= CONCILIAR_CADA_MS))
        ) {
          actual = (await conciliar()) ?? actual;
        }
        erroresSeguidos = 0;
        setPago(actual);
        setError(null);
        if (!ESTADOS_ABIERTOS.includes(actual.estado)) {
          setFase("final");
          return;
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        const status = err instanceof HttpError ? err.status : 0;
        if (status === 401) {
          setError({ tipo: "sesion", mensaje: "Tu sesión expiró. Inicia sesión para ver el estado del pago." });
          setFase("detenido");
          return;
        }
        // Buscando solo por id, el 404 puede significar que el webhook aún
        // no registró la transacción: se sigue intentando hasta el límite.
        if (status === 404 && !transaccionId) {
          setError({ tipo: "no-encontrado", mensaje: err.message });
          setFase("detenido");
          return;
        }
        if (status !== 404 && ++erroresSeguidos >= MAX_ERRORES_SEGUIDOS) {
          setError({ tipo: "red", mensaje: err.message });
          setFase("detenido");
          return;
        }
      }

      if (ancla === null) ancla = anclaVentana(null, transaccionId);
      if (!dentroDeVentana()) {
        setFase("tiempo-agotado");
        return;
      }
      const transcurrido = Date.now() - inicioRef.current;
      const espera = transcurrido < PASO_A_LENTO_MS ? INTERVALO_INICIAL_MS : INTERVALO_LENTO_MS;
      temporizador = setTimeout(consultar, espera);
    }

    consultar();
    return () => {
      controlador.abort();
      clearTimeout(temporizador);
    };
  }, [fase, referencia, transaccionId, ronda]);

  const consultarDeNuevo = useCallback(() => {
    manualRef.current = true;
    estadoRef.current?.focus();
    setError(null);
    setFase("consultando");
    setRonda((n) => n + 1);
  }, []);

  const info = pago ? ESTADOS_PAGO[pago.estado] : null;
  const consultando = fase === "consultando";

  return (
    <main className="min-h-screen px-6 py-10 bg-[#171817] text-[#f2f4ef] flex items-center justify-center">
      <div className="w-full max-w-[560px] p-7 border border-[#41433f] rounded-lg bg-[#212320]">
        <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">
          PAGOS · SANDBOX
        </p>

        <div ref={estadoRef} tabIndex={-1} className="outline-none">
        {(fase === "resolviendo" || (consultando && !pago && !error)) && (
          <>
            <h1 className="m-0 text-3xl tracking-[-1px]">Consultando tu pago...</h1>
            <p className="mt-4 text-[#a9afa7]">Un momento, estamos revisando el estado con el servidor.</p>
          </>
        )}

        {fase === "sin-referencia" && (
          <>
            <h1 className="m-0 text-3xl tracking-[-1px]">No pudimos identificar el pago</h1>
            <p className="mt-4 text-[#a9afa7] leading-[1.55]">
              Esta dirección no indica qué pago consultar y en este navegador no
              hay un pago reciente guardado. Si ya pagaste, la confirmación
              llegará al servidor desde Wompi aunque cierres esta página.
            </p>
          </>
        )}

        {fase === "tiempo-agotado" && !pago && (
          <>
            <h1 className="m-0 text-3xl tracking-[-1px]">Aún no vemos tu pago</h1>
            <p className="mt-4 text-[#a9afa7] leading-[1.55]">
              Wompi todavía no ha confirmado esta transacción a nuestro servidor.
              Puede tardar unos minutos; vuelve a consultar más tarde.
            </p>
          </>
        )}

        {error && !pago && (
          <>
            <h1 className="m-0 text-3xl tracking-[-1px]">
              {error.tipo === "no-encontrado" ? "Pago no encontrado" : "No pudimos consultar el pago"}
            </h1>
            <p role="alert" className="mt-4 text-[#ff9898] leading-[1.55]">{error.mensaje}</p>
          </>
        )}

        {pago && info && (
          <>
            <span
              className={`inline-block px-2.5 py-1 rounded border text-xs font-extrabold tracking-wide ${TONOS[info.tono]}`}
            >
              {ETIQUETAS[pago.estado]}
            </span>
            <h1 className="m-0 mt-3 text-3xl tracking-[-1px]" aria-live="polite">
              {info.titulo}
            </h1>
            <p className="mt-3 text-[#a9afa7] leading-[1.55]">
              {fase === "tiempo-agotado" && pago.estado === "PENDIENTE"
                ? "Wompi todavía no confirma el resultado. Puede tardar unos minutos más; la confirmación llegará al servidor aunque cierres esta página."
                : info.descripcion}
            </p>
            {pago.suscripcion && textoVigenciaSede(pago) && (
              <p className="mt-2 text-[#f2f4ef] leading-[1.55]" aria-live="polite">{textoVigenciaSede(pago)}</p>
            )}

            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-[#a9afa7]">Plan</dt>
              <dd className="m-0">{nombrePlan(pago.plan)}</dd>
              {pago.gym_slug && (
                <>
                  <dt className="text-[#a9afa7]">Sede pagada</dt>
                  <dd className="m-0 font-extrabold">{nombreSede(pago.gym_slug)}</dd>
                </>
              )}
              {pago.suscripcion && (
                <>
                  <dt className="text-[#a9afa7]">Estado de la sede</dt>
                  <dd className="m-0">{estadoSuscripcion(pago.suscripcion).etiqueta}</dd>
                  {pago.suscripcion.vigente_hasta && (
                    <>
                      <dt className="text-[#a9afa7]">Vigente hasta</dt>
                      <dd className="m-0">{formatearFechaColombia(pago.suscripcion.vigente_hasta)}</dd>
                    </>
                  )}
                </>
              )}
              <dt className="text-[#a9afa7]">Valor</dt>
              <dd className="m-0 font-extrabold">
                {formatearCop(pago.monto_en_centavos)} {pago.moneda}
              </dd>
              <dt className="text-[#a9afa7]">Iniciado</dt>
              <dd className="m-0 text-[#c8cbc5]">{formatoFecha.format(new Date(pago.creado_en))}</dd>
              <dt className="text-[#a9afa7]">Referencia</dt>
              <dd className="m-0 font-mono text-xs break-all text-[#c8cbc5]">{pago.referencia}</dd>
            </dl>

            {consultando && pago.estado === "PENDIENTE" && (
              <p className="mt-4 text-xs text-[#a9afa7]">Actualizando automáticamente...</p>
            )}
            {["RECHAZADO", "ERROR"].includes(pago.estado) && (
              <p className="mt-4 text-xs text-[#a9afa7]">
                {consultando
                  ? "Si reintentaste el pago en Wompi, lo estamos verificando automáticamente durante unos minutos."
                  : "Si reintentaste el pago en Wompi, pulsa «Consultar de nuevo» para verificarlo."}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-[#ff9898]">{error.mensaje}</p>
            )}
          </>
        )}
        </div>

        {!pago && referencia && <p className="mt-3 break-all text-sm text-[#a9afa7]">Referencia: {referencia}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {(pago?.estado === "PENDIENTE" || fase === "tiempo-agotado" ||
            (fase === "detenido" && error?.tipo === "red") ||
            (pago && ["RECHAZADO", "ERROR"].includes(pago.estado) && fase !== "final")) && (
            <button
              type="button"
              onClick={consultarDeNuevo}
              className="px-4 py-2.5 rounded-md border-0 bg-[#b56cff] text-white text-sm font-extrabold cursor-pointer hover:bg-[#a457f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]"
            >
              Consultar de nuevo
            </button>
          )}
          {error?.tipo === "sesion" && (
            <Link href="/login" className="text-sm font-extrabold text-[#d7adff] no-underline rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]">
              Iniciar sesión
            </Link>
          )}
          {(pago?.estado === "APROBADO" || fase === "sin-referencia" ||
            error?.tipo === "no-encontrado" ||
            (pago && ["RECHAZADO", "ANULADO", "ERROR"].includes(pago.estado))) && (
            <Link href="/dashboard/pagos" className="text-sm font-extrabold text-[#d7adff] no-underline hover:text-[#f2f4ef] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]">
              {pago?.estado === "APROBADO" ? "Volver a la suscripción" : "Revisar opciones de pago"}
            </Link>
          )}
          {pago?.gym_slug && (
            <Link href="/dashboard?seccion=suscripcion" className="text-sm font-extrabold text-[#d7adff] no-underline hover:text-[#f2f4ef] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]">
              Ver suscripciones de mis sedes
            </Link>
          )}
        </div>
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
