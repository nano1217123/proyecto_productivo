import { civilDate, dayKey, dayLabel, weekStart } from "../training/hooks/historyDates.js";

export function shiftDay(day, offset) {
  const date = civilDate(day);
  date.setUTCDate(date.getUTCDate() + offset);
  return dayKey(date);
}

export function localHomeDate(now) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function greeting(hour) {
  if (hour < 12) return "Buenos días";
  return hour < 19 ? "Buenas tardes" : "Buenas noches";
}

export function trainingState({ active, history, routines, today }) {
  if (active) return "active";
  if (history?.ultimo?.fecha === today) return "completed";
  const weekday = civilWeekday(today);
  if (routines?.some((routine) => routine.dias.includes(weekday))) return "scheduled";
  return history?.total === 0 && routines?.length === 0 ? "new" : "free";
}

export const civilWeekday = (day) => (civilDate(day).getUTCDay() + 6) % 7 + 1;

export function weekDays(today, offset = 0) {
  const monday = shiftDay(weekStart(today), offset * 7);
  return Array.from({ length: 7 }, (_, index) => shiftDay(monday, index));
}

export function progressWeeks(today, activity) {
  return [-3, -2, -1, 0].map((offset) => {
    const days = weekDays(today, offset);
    return {
      start: days[0],
      label: dayLabel(days[0], { day: "numeric", month: "short" }),
      count: activity.filter(({ fecha }) => days.includes(fecha)).reduce((sum, day) => sum + day.sesiones, 0),
    };
  });
}
