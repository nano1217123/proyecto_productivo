// Utilidades de presentación del módulo de pagos.
// La autorización real ocurre en el backend; esto solo decide qué mostrar.

export const ROLES_PAGADORES = ["admin", "usuario_particular"];

export function puedePagar(rol) {
  return ROLES_PAGADORES.includes(rol);
}

const NOMBRES_SEDE = {
  "jj-poblado": "JJ GYM El Poblado",
  "power-laureles": "Power Laureles",
  "fit-belen": "Fit Lab Belén",
};

export function nombreSede(slug) {
  return NOMBRES_SEDE[slug] || slug;
}

export function nombrePlan(plan) {
  return plan === "suscripcion_sede"
    ? "Suscripción de sede"
    : "Suscripción personal";
}

const formatoCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Wompi trabaja en centavos: 4000000 centavos = $ 40.000 COP.
export function formatearCop(centavos) {
  if (!Number.isFinite(centavos)) return "—";
  return formatoCop.format(centavos / 100);
}

const formatoUsd = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "code",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Precio de referencia: 15000 centavos USD = USD 150.
export function formatearUsd(centavos) {
  if (!Number.isFinite(centavos)) return "—";
  return formatoUsd.format(centavos / 100);
}

// Tasa USD → COP con separadores locales: "4000" → "4.000".
export function formatearTasa(tasa) {
  const valor = Number(tasa);
  if (!tasa || !Number.isFinite(valor)) return null;
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(valor);
}

export function nombrePeriodo(periodo) {
  return periodo === "mensual" ? "mes" : periodo;
}

// Solo se redirige a URLs HTTPS de Wompi.
export function esUrlCheckoutWompi(url) {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      (u.hostname === "wompi.co" || u.hostname.endsWith(".wompi.co"))
    );
  } catch {
    return false;
  }
}

// Último pago iniciado en esta pestaña. Se guarda antes de ir a Wompi para
// identificar el pago al volver si la URL de retorno no trae la referencia
// (por ejemplo, en local, donde Wompi no admite redirect-url).
const CLAVE_ULTIMO_PAGO = "jjgym:pagos:ultima-referencia";
const REFERENCIA_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

export function esReferenciaValida(valor) {
  return typeof valor === "string" && REFERENCIA_REGEX.test(valor);
}

export function guardarUltimaReferencia(referencia) {
  try {
    sessionStorage.setItem(CLAVE_ULTIMO_PAGO, referencia);
  } catch {
    // Sin almacenamiento (modo privado estricto): la URL de retorno basta.
  }
}

export function leerUltimaReferencia() {
  try {
    const valor = sessionStorage.getItem(CLAVE_ULTIMO_PAGO);
    return esReferenciaValida(valor) ? valor : null;
  } catch {
    return null;
  }
}

// Presentación de cada estado del intento. El estado siempre viene del
// backend; aquí solo se decide el texto y el color.
export const ESTADOS_PAGO = {
  PENDIENTE: {
    titulo: "Pago pendiente",
    descripcion:
      "Wompi aún no confirma el resultado. Esta página se actualizará sola.",
    tono: "pendiente",
  },
  APROBADO: {
    titulo: "Pago aprobado",
    descripcion: "Wompi confirmó tu pago.",
    tono: "exito",
  },
  RECHAZADO: {
    titulo: "Pago rechazado",
    descripcion:
      "La entidad financiera no aprobó el pago. No se realizó ningún cobro; puedes intentarlo de nuevo.",
    tono: "error",
  },
  ANULADO: {
    titulo: "Pago anulado",
    descripcion: "El pago fue anulado después de procesarse.",
    tono: "error",
  },
  ERROR: {
    titulo: "Error en el pago",
    descripcion:
      "Ocurrió un error al procesar el pago en Wompi. Puedes intentarlo de nuevo.",
    tono: "error",
  },
};

export function esEstadoFinal(estado) {
  return estado in ESTADOS_PAGO && estado !== "PENDIENTE";
}
