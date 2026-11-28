"use client";

import { useEffect, useState } from "react";
import { sedesApi } from "../api/sedesApi";

// Catálogo de sedes del backend, cargado una vez por sesión de la página.
let cache = null;
let enCurso = null;

function cargar() {
  if (cache) return Promise.resolve(cache);
  if (!enCurso) {
    enCurso = sedesApi
      .getCatalogo()
      .then((sedes) => (cache = sedes))
      .finally(() => (enCurso = null));
  }
  return enCurso;
}

export function useSedes() {
  const [sedes, setSedes] = useState(cache ?? []);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(cache === null);

  useEffect(() => {
    let activo = true;
    cargar()
      .then((data) => activo && setSedes(data))
      .catch((err) => activo && setError(err.message))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, []);

  const porSlug = Object.fromEntries(sedes.map((s) => [s.slug, s]));
  return {
    sedes,
    error,
    cargando,
    nombreSede: (slug) => porSlug[slug]?.nombre ?? slug,
    sede: (slug) => porSlug[slug] ?? null,
  };
}
