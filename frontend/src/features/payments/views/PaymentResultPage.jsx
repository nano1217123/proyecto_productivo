"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HttpError } from "@/src/lib/api/httpClient";
import { paymentsApi } from "../api/paymentsApi";
import {
  ESTADOS_PAGO,
  esEstadoFinal,
  esReferenciaValida,
  formatearCop,
  leerUltimaReferencia,
  nombrePlan,
  nombreSede,
} from "../lib/payments";

// Página de retorno desde Wompi. Identifica el intento con:
//   1. ?referencia=<ref> (el backend la añade a redirect-url),
//   2. ?id=<transacción> (lo añade Wompi; sirve cuando el webhook ya la
//      registró),
//   3. la última referencia guardada en esta pestaña antes de ir a Wompi.
// El estado mostrado siempre viene del backend (lo actualiza el webhook).
// Mientras esté pendiente se consulta de nuevo durante un tiempo limitado.

const INTERVALO_INICIAL_MS = 3000;
const INTERVALO_LENTO_MS = 6000;
const PASO_A_LENTO_MS = 30_000;
const DURACION_MAXIMA_MS = 2 * 60_000;
const MAX_ERRORES_SEGUIDOS = 3;

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

  // Consulta el estado; repite mientras esté pendiente, hasta el límite.
  useEffect(() => {
    if (fase !== "consultando") return;
    const controlador = new AbortController();
    let temporizador = null;
    let erroresSeguidos = 0;
    inicioRef.current = Date.now();

    async function consultar() {
      try {
        const actual = await paymentsApi.getPaymentStatus(
          { referencia, transaccionId },
          { signal: controlador.signal }
        );
        erroresSeguidos = 0;
        setPago(actual);
        setError(null);
        if (esEstadoFinal(actual.estado)) {
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

      const transcurrido = Date.now() - inicioRef.current;
      if (transcurrido >= DURACION_MAXIMA_MS) {
        setFase("tiempo-agotado");
        return;
      }
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
              {fase === "tiempo-agotado"
                ? "Wompi todavía no confirma el resultado. Puede tardar unos minutos más; la confirmación llegará al servidor aunque cierres esta página."
                : info.descripcion}
            </p>

            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-[#a9afa7]">Plan</dt>
              <dd className="m-0">
                {nombrePlan(pago.plan)}
                {pago.gym_slug && ` · ${nombreSede(pago.gym_slug)}`}
              </dd>
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
            {error && (
              <p role="alert" className="mt-4 text-sm text-[#ff9898]">{error.mensaje}</p>
            )}
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {(fase === "tiempo-agotado" || (fase === "detenido" && error?.tipo === "red")) && (
            <button
              type="button"
              onClick={consultarDeNuevo}
              className="px-4 py-2.5 rounded-md border-0 bg-[#b56cff] text-white text-sm font-extrabold cursor-pointer hover:bg-[#a457f2]"
            >
              Consultar de nuevo
            </button>
          )}
          {error?.tipo === "sesion" && (
            <Link href="/login" className="text-sm font-extrabold text-[#d7adff] no-underline">
              Iniciar sesión &rarr;
            </Link>
          )}
          {(fase === "sin-referencia" ||
            error?.tipo === "no-encontrado" ||
            (pago && ["RECHAZADO", "ANULADO", "ERROR"].includes(pago.estado))) && (
            <Link href="/dashboard/pagos" className="text-sm font-extrabold text-[#d7adff] no-underline hover:text-[#f2f4ef]">
              Ir a pagos &rarr;
            </Link>
          )}
          <Link href="/dashboard" className="text-sm font-extrabold text-[#f2f4ef] no-underline hover:text-[#d7adff]">
            Volver al panel &rarr;
          </Link>
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
