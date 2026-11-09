"use client";

export default function ImagesTab({
  errorImagen,
  urlImagen,
  subirImagen,
  setImagenFile,
  subiendoImagen,
  imagenFile,
  asignarImagenAEjercicio,
  ejercicioId,
  setEjercicioId,
  mensajeAsignacion,
}) {
  return (
    <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
      <h2 className="text-xl mt-0 mb-2">Subir Imagen a Cloudinary</h2>
      <p className="text-sm text-[#a9afa7] mb-6">
        Sube imágenes para los ejercicios. Las imágenes se almacenan en la nube.
      </p>

      {errorImagen && <div className="mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{errorImagen}</div>}
      
      {urlImagen && (
        <div className="mb-4 p-[10px_12px] border border-[rgba(181,108,255,0.32)] rounded-lg bg-[#321d47] text-[#d7adff] text-[13px] break-all">
          <strong>¡Imagen subida!</strong> <br />
          URL: <a href={urlImagen} target="_blank" rel="noreferrer" className="underline">{urlImagen}</a>
        </div>
      )}

      <form onSubmit={subirImagen} className="max-w-[600px] mb-8">
        <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd]">
          <label>Selecciona una imagen (máx. 5MB)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImagenFile(e.target.files[0])}
            className="w-full p-2 bg-[#151714] border border-[#41463f] rounded-[10px] text-[#f2f4ef] text-sm"
            required
          />
        </div>

        <button
          className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer transition hover:bg-[#d7adff] disabled:opacity-60"
          type="submit"
          disabled={subiendoImagen || !imagenFile}
        >
          {subiendoImagen ? "Subiendo a Cloudinary..." : "Subir Imagen"}
        </button>
      </form>

      {urlImagen && (
        <form onSubmit={asignarImagenAEjercicio} className="p-4 border border-[#41433f] rounded-lg bg-[#151714] max-w-[600px]">
          <h3 className="text-[#b56cff] font-bold mb-3">Asignar esta imagen a un ejercicio</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-[#a9afa7]">
              <label>ID del Ejercicio</label>
              <input
                type="number"
                value={ejercicioId}
                onChange={(e) => setEjercicioId(e.target.value)}
                placeholder="Ej: 1"
                className="w-full p-2 bg-[#212320] border border-[#41463f] rounded text-[#f2f4ef]"
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#b56cff] text-[#10110f] font-bold rounded hover:bg-[#d7adff]"
            >
              Asignar Imagen
            </button>
          </div>
          {mensajeAsignacion && <p className="text-[#d7adff] text-xs mt-2">{mensajeAsignacion}</p>}
        </form>
      )}
    </section>
  );
}
