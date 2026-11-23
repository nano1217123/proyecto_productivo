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
