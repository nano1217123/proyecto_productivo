"use client";

import { useState } from "react";

// Se muestra cuando el ejercicio no tiene imagen o su archivo no carga
// (por ejemplo, Cloudinary responde 404).
export const IMAGEN_PREDETERMINADA = "/ejercicio-sin-imagen.svg";

/**
 * Imagen de un ejercicio con respaldo. Con `avisoFallo`, explica debajo que
 * el archivo asignado no se pudo cargar.
 */
export default function ImagenEjercicio({ src, alt, className = "", avisoFallo = false }) {
  // Guarda la URL que falló: si cambia la imagen, se vuelve a intentar.
  const [fallida, setFallida] = useState(null);
  const rota = Boolean(src) && fallida === src;
  const predeterminada = !src || rota;

  return (
    <>
      <img
        src={predeterminada ? IMAGEN_PREDETERMINADA : src}
        alt={predeterminada ? `${alt} (imagen predeterminada)` : alt}
        data-imagen={predeterminada ? "predeterminada" : "asignada"}
        className={className}
        onError={() => { if (!predeterminada) setFallida(src); }}
      />
      {avisoFallo && rota && (
        <p role="status" className="m-0 mt-1.5 text-xs text-[#ffcf70]">
          No se pudo cargar el archivo de esta imagen; se muestra la imagen predeterminada.
        </p>
      )}
    </>
  );
}
