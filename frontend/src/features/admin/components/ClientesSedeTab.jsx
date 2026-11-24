"use client";

import { useCallback, useEffect, useState } from "react";
import { sedesApi } from "@/src/features/sedes/api/sedesApi";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import BuscarCuenta, {
  VistaCuenta,
  alertaError,
  alertaExito,
  botonPrimario,
  botonSecundario,
} from "./BuscarCuenta";

const formatoFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

// Clientes de la sede seleccionada (miembros_sede). El admin solo ve y
// cambia sus sedes; el super_admin, cualquiera. El backend lo comprueba.
export default function ClientesSedeTab({ gymSlug, esSuperAdmin }) {
  const { nombreSede } = useSedes();
  const [clientes, setClientes] = useState([]);
  const [sinSede, setSinSede] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cuenta, setCuenta] = useState(null);
  const [busquedaInicial, setBusquedaInicial] = useState("");
  const [claveBusqueda, setClaveBusqueda] = useState(0);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargar = useCallback(async () => {
    if (!gymSlug) return;
    setCargando(true);
    try {
      setClientes(await sedesApi.listarClientes(gymSlug));
      if (esSuperAdmin) setSinSede(await sedesApi.clientesSinSede());
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [gymSlug, esSuperAdmin]);

  useEffect(() => {
    setCuenta(null);
    setError("");
    setExito("");
    cargar();
  }, [cargar]);

  const bloqueo =
    !cuenta ? null
    : !cuenta.email_verified ? "La cuenta debe verificar su correo antes de vincularla."
    : cuenta.tipo_usuario === "cliente" && cuenta.sede === gymSlug ? "Esta cuenta ya es cliente de esta sede."
    : cuenta.tipo_usuario === "cliente" && cuenta.sede ? `Pertenece a ${nombreSede(cuenta.sede)}. Primero debe desvincularla esa sede o un super_admin.`
    : !["usuario_particular", "cliente"].includes(cuenta.tipo_usuario) ? "Solo se pueden vincular usuarios particulares o clientes sin sede."
    : null;

  async function vincular() {
    if (!cuenta || bloqueo || procesando) return;
    setProcesando(true);
    setError("");
    try {
      await sedesApi.vincularCliente(gymSlug, { usuarioId: cuenta.idusuario, correo: cuenta.correo });
      setExito(`${cuenta.correo} ahora es cliente de ${nombreSede(gymSlug)}.`);
      setCuenta(null);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function desvincular(cliente) {
    if (procesando) return;
    const ok = window.confirm(
      `¿Desvincular a ${cliente.nombres} ${cliente.apellidos} (${cliente.correo}) de ${nombreSede(gymSlug)}? ` +
        "Su cuenta volverá a usuario particular y conservará sus pagos."
    );
    if (!ok) return;
    setProcesando(true);
    setError("");
    setExito("");
    try {
      await sedesApi.desvincularCliente(gymSlug, cliente.idusuario);
      setExito(`${cliente.correo} fue desvinculado de ${nombreSede(gymSlug)}.`);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  function prepararBusqueda(correo) {
    setBusquedaInicial(correo);
    setClaveBusqueda((n) => n + 1);
    setCuenta(null);
  }

  if (!gymSlug) {
    return <p className="text-sm text-[#a9afa7]">No tienes sedes asignadas.</p>;
  }

  return (
    <div className="grid gap-5">
      <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
        <h2 className="text-xl mt-0 mb-2">Vincular cliente a {nombreSede(gymSlug)}</h2>
        <p className="text-sm text-[#a9afa7] mb-5">
          La persona se registra antes con su correo o con Google. Cada cliente
          pertenece a una sola sede.
        </p>

        {error && <div role="alert" className={alertaError}>{error}</div>}
        {exito && <div role="status" className={alertaExito}>{exito}</div>}

        <BuscarCuenta key={claveBusqueda} correoInicial={busquedaInicial} onResultado={setCuenta} deshabilitado={procesando} />

        {cuenta && (
          <>
            <VistaCuenta cuenta={cuenta} nombreSede={nombreSede} />
            {bloqueo ? (
              <p className="text-[13px] text-[#ff9898]">{bloqueo}</p>
            ) : (
              <div className="flex gap-3">
                <button type="button" className={botonPrimario} onClick={vincular} disabled={procesando}>
                  {procesando ? "Vinculando..." : `Vincular a ${nombreSede(gymSlug)}`}
                </button>
                <button type="button" className={botonSecundario} onClick={() => setCuenta(null)} disabled={procesando}>
                  Cancelar
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
        <h2 className="text-xl mt-0 mb-4">Clientes de {nombreSede(gymSlug)}</h2>
        {cargando && <p className="text-sm text-[#a9afa7]">Cargando clientes...</p>}
        {!cargando && clientes.length === 0 && (
          <p className="text-sm text-[#a9afa7]">Esta sede aún no tiene clientes vinculados.</p>
        )}
        <ul className="m-0 p-0 list-none grid gap-2.5">
          {clientes.map((c) => (
            <li key={c.idusuario} className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-[10px] border border-[#41433f] bg-[#151714]">
              <div>
                <p className="m-0 font-bold">{c.nombres} {c.apellidos}</p>
                <p className="m-0 text-[13px] text-[#a9afa7] break-all">
                  {c.correo} · {c.provider === "google" ? "Google" : "Correo"} · desde {formatoFecha.format(new Date(c.vinculado_en))}
                </p>
              </div>
              <button type="button" className={botonSecundario} onClick={() => desvincular(c)} disabled={procesando}>
                Desvincular
              </button>
            </li>
          ))}
        </ul>
      </section>

      {esSuperAdmin && (
        <section className="p-6 bg-[#212320] border border-[rgba(255,196,87,.35)] rounded-[14px]">
          <h2 className="text-xl mt-0 mb-2">Clientes sin sede</h2>
          <p className="text-sm text-[#a9afa7] mb-4">
            Cuentas con rol cliente que aún no tienen sede registrada. Puedes
            vincularlas a la sede seleccionada.
          </p>
          {sinSede.length === 0 ? (
            <p className="text-sm text-[#a9afa7]">No hay clientes sin sede.</p>
          ) : (
            <ul className="m-0 p-0 list-none grid gap-2.5">
              {sinSede.map((c) => (
                <li key={c.idusuario} className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-[10px] border border-[#41433f] bg-[#151714]">
                  <div>
                    <p className="m-0 font-bold">{c.nombres} {c.apellidos}</p>
                    <p className="m-0 text-[13px] text-[#a9afa7] break-all">{c.correo}</p>
                  </div>
                  <button type="button" className={botonSecundario} onClick={() => prepararBusqueda(c.correo)}>
                    Revisar y vincular
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
