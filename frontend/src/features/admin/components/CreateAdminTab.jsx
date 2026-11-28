"use client";

import { useState } from "react";
import { adminApi } from "../api/adminApi";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import BuscarCuenta, {
  VistaCuenta,
  alertaError,
  alertaExito,
  botonPrimario,
  botonSecundario,
} from "./BuscarCuenta";

// Asigna el rol admin (y sus sedes) a una persona ya registrada.
// Solo lo ve el super_admin; el backend lo vuelve a comprobar.
export default function CreateAdminTab() {
  const { sedes, nombreSede } = useSedes();
  const [cuenta, setCuenta] = useState(null);
  const [seleccion, setSeleccion] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  function alEncontrar(c) {
    setCuenta(c);
    setError("");
    setExito("");
    setSeleccion(c?.sedes_administradas ?? []);
  }

  function alternarSede(slug) {
    setSeleccion((actual) =>
      actual.includes(slug) ? actual.filter((s) => s !== slug) : [...actual, slug]
    );
  }

  const bloqueo =
    !cuenta ? null
    : !cuenta.email_verified ? "La cuenta debe verificar su correo antes de recibir un rol."
    : cuenta.tipo_usuario === "super_admin" ? "Las cuentas super_admin no se modifican desde este panel."
    : null;

  async function confirmar() {
    if (!cuenta || bloqueo || seleccion.length === 0 || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const r = await adminApi.asignarAdmin({
        usuarioId: cuenta.idusuario,
        correo: cuenta.correo,
        gymSlugs: seleccion,
      });
      setExito(`${r.message} ${cuenta.correo} administra: ${r.sedes.map(nombreSede).join(", ")}.`);
      setCuenta(null);
      setSeleccion([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px] max-w-[680px]">
      <h2 className="text-xl mt-0 mb-2">Asignar administrador de sede</h2>
      <p className="text-sm text-[#a9afa7] mb-6">
        La persona debe registrarse antes con su correo o con Google y
        verificar su cuenta. Conservará sus credenciales; solo cambia su rol y
        las sedes que administra.
      </p>

      {error && <div role="alert" className={alertaError}>{error}</div>}
      {exito && <div role="status" className={alertaExito}>{exito}</div>}

      <BuscarCuenta onResultado={alEncontrar} deshabilitado={enviando} />

      {cuenta && (
        <>
          <VistaCuenta cuenta={cuenta} nombreSede={nombreSede} />
          {bloqueo ? (
            <p className="text-[13px] text-[#ff9898]">{bloqueo}</p>
          ) : (
            <>
              <fieldset className="mb-5 border-0 p-0">
                <legend className="mb-2 text-[13px] font-semibold text-[#c0c7bd]">
                  Sedes que administrará
                </legend>
                {sedes.map((s) => (
                  <label key={s.slug} className="flex items-center gap-2.5 mb-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seleccion.includes(s.slug)}
                      onChange={() => alternarSede(s.slug)}
                    />
                    {s.nombre}
                  </label>
                ))}
              </fieldset>
              {seleccion.length > 0 && (
                <dl className="mb-4 grid gap-1 text-sm">
                  <div><dt className="inline font-bold">Cuenta: </dt><dd className="inline break-all">{cuenta.correo}</dd></div>
                  <div><dt className="inline font-bold">Rol: </dt><dd className="inline">Administrador de sede</dd></div>
                  <div><dt className="inline font-bold">Sedes: </dt><dd className="inline">{seleccion.map(nombreSede).join(", ")}</dd></div>
                </dl>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={botonPrimario}
                  onClick={confirmar}
                  disabled={enviando || seleccion.length === 0}
                >
                  {enviando
                    ? "Asignando..."
                    : cuenta.tipo_usuario === "admin"
                      ? "Actualizar sedes"
                      : seleccion.length === 1 ? `Asignar administrador de ${nombreSede(seleccion[0])}` : "Asignar administrador de las sedes seleccionadas"}
                </button>
                <button type="button" className={botonSecundario} onClick={() => alEncontrar(null)} disabled={enviando}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
