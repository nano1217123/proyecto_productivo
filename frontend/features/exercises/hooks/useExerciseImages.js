import { useState, useEffect } from "react";
import { exercisesApi } from "../api/exercisesApi";

export function useExerciseImages(groupSlug) {
  const [imagenes, setImagenes] = useState({});

  useEffect(() => {
    if (!groupSlug) return;
    let cancelled = false;

    async function loadImagenes() {
      try {
        const mapa = await exercisesApi.getImagesByGroup(groupSlug);
        if (!cancelled) setImagenes(mapa);
      } catch (err) {
        console.error("Error cargando imágenes", err);
      }
    }

    loadImagenes();
    return () => { cancelled = true; };
  }, [groupSlug]);

  return imagenes;
}
