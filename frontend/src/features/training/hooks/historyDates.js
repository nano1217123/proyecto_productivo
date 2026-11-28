// La fecha de sesión es una fecha civil de la sede, guardada sin hora en PostgreSQL.
export const zone = "America/Bogota";
export const civilToday = (now = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: zone }).format(now);
export const dayKey = (date) => date.toISOString().slice(0, 10);
export const civilDate = (key) => new Date(`${key}T00:00:00Z`);
export const dayLabel = (key, options) => civilDate(key).toLocaleDateString("es-CO", { ...options, timeZone: "UTC" });
export const timeLabel = (date) => new Date(date).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: zone });
export const monthLabel = (key) => dayLabel(key, { month: "long", year: "numeric" });
export const fullDate = (key) => dayLabel(key, { dateStyle: "full" });
export const number = (value) => value == null ? "—" : Number(value).toLocaleString("es-CO", { maximumFractionDigits: 2 });
export const minutes = (seconds) => {
  if (seconds == null) return "—";
  const value = Math.floor(seconds / 60);
  return value < 60 ? `${value} min` : `${Math.floor(value / 60)} h ${value % 60} min`;
};

export function monthRange(key, offset = 0) {
  const date = civilDate(key);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + offset);
  const end = new Date(date);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  return { desde: dayKey(date), hasta: dayKey(end) };
}

export function weekStart(today) {
  const date = civilDate(today);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return dayKey(date);
}
