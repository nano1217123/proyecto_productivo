"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { muscleGroupBySlug } from "../lib/muscleGroups";
import { getExerciseAnatomy } from "../lib/muscleMap";
import { slugify } from "../lib/slugify";
import BodyMuscleDiagram from "../components/BodyMuscleDiagram";
import { ExerciseGroupSkeleton } from "@/src/components/ui/Skeleton";
import { useExerciseImages } from "../hooks/useExerciseImages";
import { exercisesApi } from "../api/exercisesApi";

/**
 * Mapea un ejercicio (que puede venir con campos en snake_case desde la API del backend)
 * a la interfaz esperada por las tarjetas y el modal del frontend.
 */
function mapBackendExercise(item, staticExercises = []) {
  const normSlug = item.slug || slugify(item.nombre || item.name || "");
  const staticMatch = staticExercises.find(
    (s) =>
      slugify(s.name) === normSlug ||
      s.name?.toLowerCase() === (item.nombre || item.name)?.toLowerCase()
  );

  return {
    id: item.id,
    slug: normSlug,
    name: item.nombre || item.name || staticMatch?.name || "",
    primary:
      item.musculo_principal ||
      item.musculoPrincipal ||
      item.primary ||
      staticMatch?.primary ||
      "Músculo principal",
    equipment:
      item.equipo ||
      item.equipment ||
      staticMatch?.equipment ||
      "Peso corporal",
    description:
      item.descripcion ||
      item.description ||
      staticMatch?.description ||
      "Sin descripción disponible.",
    tip:
      item.consejo ||
      item.tip ||
      staticMatch?.tip ||
      "Mantén una ejecución controlada y cuida la postura.",
    imagenUrl: item.imagen_url || item.imagenUrl || null,
  };
}

export default function ExerciseGroupPage({ groupSlug, gym = "jj-poblado" }) {
  const { profile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Modo Casa: por la URL (?modo=casa) o porque el usuario es particular
  const esParticular = profile?.tipo_usuario === "usuario_particular";
  const modoCasa = searchParams.get("modo") === "casa" || esParticular;

  // 2. Estado local para los datos del grupo (reemplaza la constante estática group)
  const [groupData, setGroupData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(null);
  const [restoredFromUrl, setRestoredFromUrl] = useState(false);
  const [vistaModal, setVistaModal] = useState("foto");

  // 3. useEffect para cargar los datos según el modo
  useEffect(() => {
    let cancelled = false;

    // Limpia los datos del modo/grupo anterior para no mostrar, mientras
    // carga, la lista completa de gimnasio en la vista de casa (o viceversa).
    setGroupData(null);
    setLoadError(null);

    async function loadGroup() {
      if (modoCasa) {
        try {
          // Llama a la API con filtro para casa
          const catalogo = await exercisesApi.getExerciseCatalog(true);
          if (cancelled) return;

          const staticGroup = muscleGroupBySlug[groupSlug];
          const found = Array.isArray(catalogo)
            ? catalogo.find((g) => g.slug === groupSlug)
            : null;

          if (found) {
            setGroupData({
              slug: groupSlug,
              name: found.nombre || found.name || staticGroup?.name || groupSlug,
              accent: staticGroup?.accent || "#b56cff",
              exercises: (found.ejercicios || found.exercises || []).map((ej) =>
                mapBackendExercise(ej, staticGroup?.exercises || [])
              ),
            });
          } else {
            // El grupo no tiene ejercicios que apliquen a casa o no se encontró en catálogo
            setGroupData({
              slug: groupSlug,
              name: staticGroup?.name || groupSlug,
              accent: staticGroup?.accent || "#b56cff",
              exercises: [],
            });
          }
        } catch (err) {
          console.error("Error al cargar ejercicios en modo casa:", err);
          // No se usa el catálogo estático como respaldo: contiene ejercicios
          // de gimnasio y el usuario los vería como si fueran para casa.
          if (!cancelled) {
            setLoadError(
              err?.message || "No se pudo cargar el catálogo de ejercicios para casa."
            );
          }
        }
      } else {
        // Modo normal: usa el archivo estático directamente sin peticiones de red
        const staticGroup = muscleGroupBySlug[groupSlug];
        setGroupData(staticGroup || null);
      }
    }

    loadGroup();

    return () => {
      cancelled = true;
    };
  }, [groupSlug, modoCasa, reloadKey]);

  // Redirige al listado si el grupo no existe
  useEffect(() => {
    if (!loading && !muscleGroupBySlug[groupSlug]) {
      router.replace(
        `/dashboard/ejercicios?gym=${encodeURIComponent(gym)}${modoCasa ? "&modo=casa" : ""}`
      );
    }
  }, [loading, groupSlug, gym, router, modoCasa]);

  // Restaura ejercicio seleccionado desde el query param ?ejercicio=slug
  useEffect(() => {
    if (!groupData || restoredFromUrl) return;
    const slug = searchParams.get("ejercicio");
    if (slug) {
      const match = groupData.exercises.find((exercise) => slugify(exercise.name) === slug);
      if (match) setSelected(match);
    }
    setRestoredFromUrl(true);
  }, [groupData, restoredFromUrl, searchParams]);

  // Cierre con tecla Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") closeModal();
    }
    if (selected) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const imagenes = useExerciseImages(groupSlug);

  const getExerciseImage = (exercise) =>
    exercise?.imagenUrl || imagenes[slugify(exercise?.name || "")] || imagenes[exercise?.slug];

  function syncUrl(exerciseOrNull) {
    const params = new URLSearchParams(searchParams.toString());
    if (exerciseOrNull) params.set("ejercicio", slugify(exerciseOrNull.name));
    else params.delete("ejercicio");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }

  function openExercise(exercise) {
    setSelected(exercise);
    syncUrl(exercise);
  }

  function closeModal() {
    setSelected(null);
    syncUrl(null);
  }

  if (!loading && loadError) {
    return (
      <main className="min-h-screen px-6 pb-[72px] bg-[#171817] grid place-items-center">
        <div className="max-w-md py-12 px-6 text-center border border-[#41433f] rounded-lg bg-[#212320]">
          <span className="inline-block text-3xl mb-3" aria-hidden="true">🏠</span>
          <h1 className="m-0 mb-2 text-lg font-bold text-[#f2f4ef]">
            No pudimos cargar los ejercicios en casa
          </h1>
          <p className="m-0 mb-5 text-sm text-[#a9afa7]">{loadError}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-full bg-[#b56cff] text-[#10110f] text-sm font-bold cursor-pointer"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Reintentar
            </button>
            <Link
              className="px-4 py-2 rounded-full border border-[#41433f] text-[#a9afa7] text-sm font-bold no-underline hover:text-[#f2f4ef]"
              href={`/dashboard/ejercicios?gym=${encodeURIComponent(gym)}&modo=casa`}
            >
              Volver a grupos
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading || !groupData) {
    return <ExerciseGroupSkeleton />;
  }

  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817]">
      <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Link
          className="inline-flex items-center gap-2.5 text-[#f2f4ef] text-[17px] font-extrabold tracking-widest no-underline"
          href={`/dashboard?gym=${encodeURIComponent(gym)}${modoCasa ? "&modo=casa" : ""}`}
        >
          <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#b56cff] text-white text-[10px] tracking-[-1px]">
            GYM
          </span>
          <span>{modoCasa ? "Ejercicios en Casa" : "Ejercicios"}</span>
        </Link>
        <button
          className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]"
          type="button"
          onClick={logout}
        >
          Cerrar sesion
        </button>
      </header>

      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px]">
        <Link
          className="inline-block mb-8 text-[13px] font-bold text-[#a9afa7] no-underline hover:text-[#b56cff]"
          href={`/dashboard/ejercicios?gym=${encodeURIComponent(gym)}${modoCasa ? "&modo=casa" : ""}`}
        >
          &larr; Grupos musculares
        </Link>
        <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">
          {groupData.name.toUpperCase()} {modoCasa && "• EN CASA"}
        </p>
        <h1 className="m-0 text-[clamp(34px,5vw,54px)] tracking-[-1.8px] leading-[1.05] text-[#f2f4ef]">
          Ejercicios de {groupData.name.toLowerCase()}
        </h1>
        <p className="max-w-[510px] mt-[15px] text-[15px] leading-[1.6] text-[#a9afa7]">
          {modoCasa
            ? "Ejercicios adaptados para entrenar en casa sin máquinas de gimnasio. Toca cualquiera para ver detalles."
            : "Toca cualquier ejercicio para ver como hacerlo, el musculo principal que trabaja y un consejo clave."}
        </p>
      </section>

      <section
        className="w-full max-w-[1060px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]"
        aria-label={`Ejercicios de ${groupData.name}`}
      >
        {groupData.exercises.length === 0 ? (
          <div className="col-span-full py-16 px-6 text-center border border-dashed border-[#41433f] rounded-2xl bg-[#212320]/60">
            <span className="inline-block text-3xl mb-3" aria-hidden="true">
              {modoCasa ? "🏠" : "🏋️"}
            </span>
            <h3 className="m-0 mb-2 text-lg font-bold text-[#f2f4ef]">
              {modoCasa
                ? "No hay ejercicios para este grupo en Modo Casa"
                : "No hay ejercicios para este grupo"}
            </h3>
            <p className="m-0 text-sm text-[#a9afa7] max-w-md mx-auto">
              {modoCasa
                ? "Este grupo muscular requiere máquinas de gimnasio o no cuenta con variantes disponibles sin equipamiento."
                : "Todavía no hay ejercicios cargados para este grupo muscular."}
            </p>
          </div>
        ) : (
          groupData.exercises.map((exercise, index) => {
            const imgSrc = getExerciseImage(exercise);
            return (
              <button
                className="group relative flex flex-col items-start border border-[#41433f] rounded-lg bg-[#212320] text-left text-[#f2f4ef] cursor-pointer transition hover:border-[var(--accent)] hover:bg-[#292b28] hover:-translate-y-1 overflow-hidden"
                key={exercise.name}
                type="button"
                style={{ "--accent": groupData.accent }}
                onClick={() => openExercise(exercise)}
              >
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={exercise.name}
                    className="w-full h-[140px] object-cover border-b border-[#41433f]"
                  />
                )}

                <div className="p-5 flex flex-col items-start gap-1.5 w-full flex-1">
                  <span className="text-[11px] font-extrabold tracking-widest text-[var(--accent)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="m-0 text-[17px]">{exercise.name}</h2>
                  <p className="m-0 text-[12.5px] text-[#a9afa7]">{exercise.primary}</p>
                  <span className="mt-auto pt-2.5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[var(--accent)]">
                    Ver detalle <b aria-hidden="true">&rarr;</b>
                  </span>
                </div>
              </button>
            );
          })
        )}
      </section>

      {selected && (() => {
        const anatomy = getExerciseAnatomy(selected, groupSlug, groupData.name);
        const modalImgSrc = getExerciseImage(selected);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[rgba(8,9,7,0.72)] backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            onClick={closeModal}
          >
            <div
              className="relative w-full max-w-[480px] max-h-[88vh] overflow-y-auto p-[30px_28px] border border-[#41433f] rounded-2xl bg-[#1c1e1b]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 w-8 h-8 border border-[#41433f] rounded-full bg-[#262822] text-[#f2f4ef] text-lg leading-none cursor-pointer hover:border-[#b56cff] hover:text-[#b56cff]"
                type="button"
                onClick={closeModal}
                aria-label="Cerrar"
              >
                &times;
              </button>

              {/* Pestañas para Foto / Diagrama */}
              <div className="flex justify-center gap-3 mb-4 mt-2">
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${
                    vistaModal === "foto"
                      ? "bg-[#b56cff] text-[#10110f]"
                      : "bg-[#262822] text-[#a9afa7] hover:text-[#f2f4ef]"
                  }`}
                  onClick={() => setVistaModal("foto")}
                >
                  Foto
                </button>
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${
                    vistaModal === "diagrama"
                      ? "bg-[#b56cff] text-[#10110f]"
                      : "bg-[#262822] text-[#a9afa7] hover:text-[#f2f4ef]"
                  }`}
                  onClick={() => setVistaModal("diagrama")}
                >
                  Diagrama
                </button>
              </div>

              {/* Contenedor de la vista */}
              <div className="mb-4">
                {vistaModal === "foto" &&
                  (modalImgSrc ? (
                    <img
                      src={modalImgSrc}
                      alt={selected.name}
                      className="w-full h-[240px] object-cover rounded-lg border border-[#41433f] bg-[#151714]"
                    />
                  ) : (
                    <div className="w-full h-[240px] flex items-center justify-center rounded-lg border border-[#41433f] bg-[#151714] text-[#a9afa7]">
                      Imagen no disponible
                    </div>
                  ))}

                {vistaModal === "diagrama" && (
                  <BodyMuscleDiagram
                    primaryMuscles={anatomy.primaryIds}
                    secondaryMuscles={anatomy.secondaryIds}
                    accent={groupData.accent}
                  />
                )}
              </div>

              <p
                className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px]"
                style={{ color: groupData.accent }}
              >
                {groupData.name.toUpperCase()}
              </p>
              <h2 className="m-[4px_0_14px] text-[25px] tracking-[-.6px] text-[#f2f4ef]">{selected.name}</h2>

              <dl className="grid grid-cols-2 gap-3 m-0 mb-4 p-[14px] rounded-[10px] bg-[#151714]">
                <div>
                  <dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">
                    Grupo
                  </dt>
                  <dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">{anatomy.grupo}</dd>
                </div>
                <div>
                  <dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">
                    Musculo principal
                  </dt>
                  <dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">
                    {anatomy.principal.map((m) => m.label).join(", ")}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">
                    Zona
                  </dt>
                  <dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">
                    {anatomy.principal.map((m) => m.zone).join(" · ")}
                  </dd>
                </div>
                {anatomy.secundarios.length > 0 && (
                  <div className="col-span-2">
                    <dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">
                      Secundarios
                    </dt>
                    <dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">
                      {anatomy.secundarios.map((m) => m.label).join(", ")}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">
                    Vista
                  </dt>
                  <dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">{anatomy.vista}</dd>
                </div>
                <div>
                  <dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">
                    Equipo
                  </dt>
                  <dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">{selected.equipment}</dd>
                </div>
              </dl>

              <p className="m-0 mb-[14px] text-sm leading-[1.6] text-[#c7ccc2]">
                {selected.description}
              </p>
              <p className="m-0 p-[12px_14px] border-l-[3px] border-[#b56cff] rounded bg-[#321d47] text-[#ddd7f5] text-[13px] leading-[1.55]">
                <strong>Consejo:</strong> {selected.tip}
              </p>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
