import { useState } from "react";
import { minutes, number } from "../hooks/historyDates";
import { modes } from "../hooks/trainingSessionModel";

function Metrics({ metrics, comparison }) {
  return <div className="history-scroll"><table>
    <thead><tr><th scope="col">Indicador</th><th scope="col">{comparison.anterior || "Referencia"}</th>
      <th scope="col">{comparison.reciente || "Segunda sesión"}</th><th scope="col">Diferencia</th></tr></thead>
    <tbody>{Object.entries(metrics).filter(([, values]) => values.anterior != null || values.reciente != null)
      .map(([metric, value]) => {
        const format = metric === "Duración" ? minutes : number;
        const unit = metric === "Volumen" || metric === "Peso máximo" ? " kg" : metric === "Distancia" ? " km" : "";
        return <tr key={metric}><th scope="row">{metric}</th>
          <td>{value.anterior == null ? "—" : format(value.anterior) + unit}</td>
          <td>{value.reciente == null ? "—" : format(value.reciente) + unit}</td>
          <td>{value.cambio == null ? "—" : `${value.cambio >= 0 ? "+" : "−"}${format(Math.abs(value.cambio))}${unit}`}
            {value.porcentaje != null && <small> ({number(value.porcentaje)} %)</small>}</td></tr>;
      })}</tbody>
  </table></div>;
}

export default function HistoryComparison({ data }) {
  const [selection, setSelection] = useState(null);
  const selected = data.ejercicios.find((item) => item.clave === selection) || data.ejercicios[0];
  return <div className="history-stack">
    <h2>Comparar entrenamientos</h2>
    <p className="history-muted">La diferencia se calcula respecto a la sesión de referencia.</p>
    <Metrics metrics={data.general} comparison={data} />
    {data.general.Volumen.anterior == null && <p className="history-muted">El volumen total requiere ejercicios y métricas compatibles en ambas sesiones.</p>}
    {!selected ? <p>No hay ejercicios en común con el mismo tipo de registro.</p> :
      <section className="history-panel">
        <label>Ejercicio en común<select value={selected.clave} onChange={(e) => setSelection(e.target.value)}>
          {data.ejercicios.map((item) => <option key={item.clave} value={item.clave}>{item.nombre} · {modes[item.tipo]?.label}</option>)}
        </select></label>
        <Metrics metrics={selected.metricas} comparison={data} />
      </section>}
  </div>;
}
