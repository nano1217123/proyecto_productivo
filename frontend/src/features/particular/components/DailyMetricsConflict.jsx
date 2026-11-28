"use client";

import { useEffect, useRef, useState } from "react";

const metricas = [
  ["pesoActualKg", "weight", "Peso", (valor) => valor === "" ? "Sin registrar" : `${valor} kg`],
  ["vasosAgua", "water", "Hidratación", (valor) => `${valor} vasos`],
  ["entrenamientoCompletado", "workoutDone", "Entrenamiento", (valor) => valor ? "Completado" : "Pendiente"],
];

export default function DailyMetricsConflict({ conflicto, consultarNuevoDia, resolverConflicto, formularioRef }) {
  const [revisando, setRevisando] = useState(false);
  const [seleccion, setSeleccion] = useState([]);
  const { cambios, nuevoDia, consultando, error } = conflicto;
  const consultaRef = useRef(null);
  const revisarRef = useRef(null);
  const camposRef = useRef(null);
  const hayNuevoDia = Boolean(nuevoDia);

  useEffect(() => {
    if (!hayNuevoDia) {
      consultaRef.current?.focus();
    } else if (revisando) {
      camposRef.current?.querySelector('input[type="checkbox"]')?.focus();
    } else {
      revisarRef.current?.focus();
    }
  }, [hayNuevoDia, revisando]);

  function resolverYVolverAlFormulario(campos) {
    resolverConflicto(campos);
    formularioRef.current?.focus();
  }

  return (
    <section aria-label="Cambio de día" className="my-4 space-y-3 rounded-xl border border-gray-700 p-3 text-sm">
      <p role="status">
        Cambió el día en Bogotá. Tus cambios siguen en el borrador.
        {nuevoDia && ` Nuevo día: ${nuevoDia.diaLocal}.`}
      </p>
      {error && <p role="alert">{error}</p>}
      {nuevoDia ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="underline" onClick={() => resolverYVolverAlFormulario()}>
              Descartar cambios
            </button>
            {!revisando && (
              <button ref={revisarRef} type="button" className="underline" onClick={() => setRevisando(true)}>
                Revisar cambios
              </button>
            )}
          </div>
          {revisando && (
            <fieldset ref={camposRef} className="space-y-2">
              <legend className="mb-2">Selecciona las métricas que quieres trasladar al nuevo día</legend>
              {metricas.filter(([campo]) => Object.hasOwn(cambios, campo)).map(([campo, habit, etiqueta, formato]) => (
                <label key={campo} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={seleccion.includes(campo)}
                    onChange={(evento) => {
                      const marcado = evento.target.checked;
                      setSeleccion((actual) => marcado ? [...actual, campo] : actual.filter((valor) => valor !== campo));
                    }}
                  />
                  <span>{etiqueta}: {formato(nuevoDia.habits[habit])} a {formato(cambios[campo])}</span>
                </label>
              ))}
              <button
                type="button"
                className="underline disabled:opacity-50"
                disabled={seleccion.length === 0}
                onClick={() => resolverYVolverAlFormulario(seleccion)}
              >
                Aplicar selección al formulario
              </button>
            </fieldset>
          )}
        </>
      ) : (
        <button
          ref={consultaRef}
          type="button" className="underline aria-disabled:opacity-50"
          aria-disabled={consultando}
          onClick={() => { if (!consultando) consultarNuevoDia(); }}
        >
          {consultando ? "Consultando..." : error ? "Reintentar consulta" : "Consultar nuevo día"}
        </button>
      )}
    </section>
  );
}
