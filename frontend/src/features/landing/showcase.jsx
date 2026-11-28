"use client";

import { useState } from "react";

const screens = [
  ["inicio", "Inicio", "Consulta tu actividad reciente y encuentra los accesos a tu entrenamiento y nutrición."],
  ["entrenamiento", "Entrenamiento", "Inicia una sesión libre o elige una de tus rutinas como plantilla."],
  ["rutinas", "Rutinas", "Organiza las rutinas que quieres seguir durante la semana."],
  ["nutricion", "Nutrición", "Consulta el catálogo de alimentos y registra tus aportes de proteína."],
  ["progreso", "Progreso", "Revisa la frecuencia de tus sesiones y tus marcas deportivas."],
];

export default function ProductShowcase() {
  const [selected, setSelected] = useState(0);
  const [image, label, description] = screens[selected];

  return <>
    <div className="ll-screen-controls" role="group" aria-label="Vistas del producto">
      {screens.map(([key, name], index) => (
        <button key={key} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{name}</button>
      ))}
    </div>
    <figure className="ll-screen">
      <div className="ll-screen-toolbar"><span aria-hidden="true">● ● ●</span> J&amp;J GYM · {label}</div>
      <img src={`/landing/${image}.webp`} width="1200" height="755" loading={selected === 0 ? "lazy" : "eager"} decoding="async" alt={`Captura de la vista de ${label.toLowerCase()} de J&J GYM con datos de demostración`} />
      <figcaption aria-live="polite">{description} <small>Datos de demostración.</small></figcaption>
    </figure>
  </>;
}
