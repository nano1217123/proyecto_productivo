import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { civilToday, dayLabel, number } from "@/src/features/training/hooks/historyDates";

export function compactDate(day) {
  return dayLabel(day, { day: "numeric", month: "short" });
}

export function ProgressChart({ points, label, unit, weight = false }) {
  if (!points.length) return <p className="progress-empty">{weight ? "Registra tu peso para empezar a ver su evolución." : "No hay series para esta combinación."}</p>;
  const values = points.map(({ value }) => value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(weight ? 2 : 1, (max - min) * 0.12);
  return <>
    {points.length === 1 && <p className="progress-muted">Hay un solo registro para esta vista.</p>}
    <div className="progress-chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={points} margin={{ top: 12, right: 16, left: 8, bottom: 6 }} accessibilityLayer>
          <CartesianGrid stroke="var(--line)" strokeDasharray="4 5" vertical={false} />
          <XAxis type="number" dataKey="time" domain={["dataMin", "dataMax"]} tickCount={5}
            ticks={points.length === 1 ? [points[0].time] : undefined}
            tickFormatter={(time) => compactDate(weight ? civilToday(new Date(time)) : new Date(time).toISOString().slice(0, 10))}
            stroke="var(--muted)" allowDecimals={false} minTickGap={24} />
          <YAxis width={66} domain={[Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)]}
            tickFormatter={(value) => `${number(value)} ${unit}`} stroke="var(--muted)" />
          <Tooltip contentStyle={{ background: "var(--surface)", borderColor: "var(--line)" }}
            labelFormatter={(_, payload) => payload?.[0]?.payload.detail ?? ""}
            formatter={(value) => [`${number(value)} ${unit}`, label]} />
          <Line dataKey="value" name={label} type="linear" stroke="var(--green)" strokeWidth={3}
            dot={points.length < 100 ? { r: 3, fill: "var(--green)" } : false} activeDot={{ r: 6 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </>;
}
