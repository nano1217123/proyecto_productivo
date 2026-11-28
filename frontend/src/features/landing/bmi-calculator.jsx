"use client";

import { useState } from "react";
import { calculateBmi, getBmiStatus } from "@/src/lib/bmi";

const formatter = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function BMICalculator() {
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("170");
  const invalidWeight = weight !== "" && (Number(weight) < 1 || Number(weight) > 300);
  const invalidHeight = height !== "" && (Number(height) < 50 || Number(height) > 250);
  const bmi = calculateBmi(weight, height);

  return <div className="ll-bmi-panel">
    <div className="ll-bmi-fields">
      <label htmlFor="weight">Peso (kg)
        <input id="weight" type="number" inputMode="decimal" min="1" max="300" step="any" value={weight}
          aria-describedby="ll-weight-hint" aria-invalid={invalidWeight} onChange={(event) => setWeight(event.target.value)} />
        <small id="ll-weight-hint">Entre 1 y 300 kg</small>
      </label>
      <label htmlFor="height">Altura (cm)
        <input id="height" type="number" inputMode="decimal" min="50" max="250" step="any" value={height}
          aria-describedby="ll-height-hint" aria-invalid={invalidHeight} onChange={(event) => setHeight(event.target.value)} />
        <small id="ll-height-hint">Entre 50 y 250 cm</small>
      </label>
    </div>
    <output className="ll-bmi-result" htmlFor="weight height" aria-live="polite">
      <span><strong>Resultado estimado</strong><small>{bmi === null ? "Ingresa peso y altura dentro de los rangos indicados." : getBmiStatus(bmi).label}</small></span>
      <b>{bmi === null ? "—" : formatter.format(bmi)}</b>
    </output>
  </div>;
}
