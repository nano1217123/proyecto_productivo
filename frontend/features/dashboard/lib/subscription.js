export function getSubscriptionStatus(profile) {
  if (!profile?.tiempo_registrado || !profile?.tiempo_duracion_inscripcion) return null;

  const start = new Date(profile.tiempo_registrado);
  const daysMatch = String(profile.tiempo_duracion_inscripcion).match(/(\d+)\s*day/);
  const days = daysMatch ? parseInt(daysMatch[1], 10) : 0;
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  return { end, active: end.getTime() > Date.now() };
}
