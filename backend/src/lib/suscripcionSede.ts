// Reglas de vigencia de la suscripción SaaS por sede (RF-013 / RN-012).
//
// Cada pago aprobado concede un mes calendario:
// - Primer pago, o sede ya vencida en el momento de la aprobación: el
//   período empieza en la aprobación (finalized_at verificado con Wompi).
// - Sede vigente: el período empieza en su vencimiento actual, así que
//   pagar antes de tiempo no hace perder días.
//
// Zona horaria: America/Bogota (UTC−5, sin horario de verano desde 1993).
// El día y la hora de vencimiento se calculan en hora de Colombia.
//
// Finales de mes: el vencimiento cae en el «día de corte», el día del mes
// de la activación (o reactivación). Si el mes siguiente no tiene ese día,
// vence el último día de ese mes, y el día de corte se conserva para los
// meses siguientes:
//   31 ene → 28 feb (29 en bisiesto) → 31 mar → 30 abr → 31 may …
// La hora del día es la de la aprobación que fijó el día de corte.

export const ZONA_HORARIA_SUSCRIPCIONES = "America/Bogota";
const DESFASE_COLOMBIA_MS = -5 * 60 * 60 * 1000;

export type TipoPeriodoSede = "activacion" | "renovacion" | "reactivacion";
export type EstadoSuscripcionSede = "activa" | "vencida" | "sin_suscripcion";

// Fecha y hora de Colombia de un instante, leídas con los métodos UTC.
function enColombia(instante: Date): Date {
  return new Date(instante.getTime() + DESFASE_COLOMBIA_MS);
}

export function diaDelMesEnColombia(instante: Date): number {
  return enColombia(instante).getUTCDate();
}

// Suma un mes calendario a `desde` y deja el vencimiento en `diaCorte` (o en
// el último día del mes si ese día no existe), con la misma hora de Colombia.
export function sumarMesCalendario(desde: Date, diaCorte: number): Date {
  if (!Number.isInteger(diaCorte) || diaCorte < 1 || diaCorte > 31) {
    throw new RangeError(`Día de corte inválido: ${diaCorte}`);
  }
  const local = enColombia(desde);
  const anio = local.getUTCFullYear();
  const mes = local.getUTCMonth() + 1;
  const diasDelMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const vence = Date.UTC(
    anio,
    mes,
    Math.min(diaCorte, diasDelMes),
    local.getUTCHours(),
    local.getUTCMinutes(),
    local.getUTCSeconds(),
    local.getUTCMilliseconds()
  );
  return new Date(vence - DESFASE_COLOMBIA_MS);
}

export interface SuscripcionVigente {
  vigenteHasta: Date | null;
  diaCorte: number | null;
}

export interface PeriodoCalculado {
  tipo: TipoPeriodoSede;
  desde: Date;
  hasta: Date;
  diaCorte: number;
}

// Período que concede un pago aprobado en `aprobadoEn` sobre la suscripción
// actual de la sede.
export function calcularPeriodoSede(actual: SuscripcionVigente, aprobadoEn: Date): PeriodoCalculado {
  if (actual.vigenteHasta && actual.diaCorte && actual.vigenteHasta.getTime() > aprobadoEn.getTime()) {
    return {
      tipo: "renovacion",
      desde: actual.vigenteHasta,
      hasta: sumarMesCalendario(actual.vigenteHasta, actual.diaCorte),
      diaCorte: actual.diaCorte,
    };
  }
  const diaCorte = diaDelMesEnColombia(aprobadoEn);
  return {
    tipo: actual.vigenteHasta ? "reactivacion" : "activacion",
    desde: aprobadoEn,
    hasta: sumarMesCalendario(aprobadoEn, diaCorte),
    diaCorte,
  };
}

// Estado que se muestra en el panel. En esta fase no bloquea el acceso.
export function estadoSuscripcionSede(vigenteHasta: Date | null, ahora: Date): EstadoSuscripcionSede {
  if (!vigenteHasta) return "sin_suscripcion";
  return vigenteHasta.getTime() > ahora.getTime() ? "activa" : "vencida";
}
