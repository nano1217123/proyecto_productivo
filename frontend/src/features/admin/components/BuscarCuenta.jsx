"use client";

import { useState } from "react";
import { sedesApi } from "@/src/features/sedes/api/sedesApi";

const ROLES = {
  usuario_particular: "Usuario particular",
  cliente: "Cliente",
  admin: "Administrador",
  super_admin: "Super administrador",
};

export const inputClass =
  "w-full p-[12px_13px] border border-[#41463f] rounded-[10px] outline-0 bg-[#151714] text-[#f2f4ef] text-sm focus:border-[#b56cff]";
export const botonPrimario =
  "px-4 py-2.5 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer hover:bg-[#d7adff] disabled:opacity-60 disabled:cursor-not-allowed";
export const botonSecundario =
  "px-4 py-2.5 rounded-[10px] border border-[#41433f] bg-transparent text-[#a9afa7] text-sm font-bold cursor-pointer hover:text-[#f2f4ef] disabled:opacity-60";
export const alertaError =
  "mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]";
export const alertaExito =
  "mb-4 p-[10px_12px] border border-[rgba(181,108,255,0.32)] rounded-lg bg-[#321d47] text-[#d7adff] text-[13px]";

// Busca una cuenta por correo exacto y la muestra para confirmarla.
export default function BuscarCuenta({ correoInicial = "", onResultado, deshabilitado }) {
  const [correo, setCorreo] = useState(correoInicial);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");

  async function buscar(e) {
    e.preventDefault();
    const valor = correo.trim();
    if (!valor) return;
    setError("");
    setBuscando(true);
    onResultado(null);
    try {
      onResultado(await sedesApi.buscarCuenta(valor));
    } catch (err) {
      setError(err.message);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <form onSubmit={buscar} className="mb-4">
      <label htmlFor="buscar-correo" className="block mb-2 text-[13px] font-semibold text-[#c0c7bd]">
        Correo de la cuenta registrada
      </label>
      <div className="flex gap-2.5">
        <input
          id="buscar-correo"
          type="email"
          className={inputClass}
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="persona@correo.com"
          required
          disabled={deshabilitado}
        />
        <button type="submit" className={botonPrimario} disabled={buscando || deshabilitado}>
          {buscando ? "Buscando..." : "Buscar"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-[13px] text-[#ff7979]">{error}</p>}
    </form>
  );
}

// Datos que permiten confirmar que es la cuenta correcta.
export function VistaCuenta({ cuenta, nombreSede }) {
  return (
    <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 p-4 rounded-[10px] border border-[#41433f] bg-[#151714] text-sm">
      <dt className="text-[#a9afa7]">Nombre</dt>
      <dd className="m-0 font-bold">{cuenta.nombres} {cuenta.apellidos}</dd>
      <dt className="text-[#a9afa7]">Correo</dt>
      <dd className="m-0 break-all">{cuenta.correo}</dd>
      <dt className="text-[#a9afa7]">Acceso</dt>
      <dd className="m-0">{cuenta.provider === "google" ? "Google" : "Correo y contraseña"}</dd>
      <dt className="text-[#a9afa7]">Verificada</dt>
      <dd className={`m-0 ${cuenta.email_verified ? "" : "text-[#ff9898]"}`}>
        {cuenta.email_verified ? "Sí" : "No (debe verificar su correo)"}
      </dd>
      <dt className="text-[#a9afa7]">Rol actual</dt>
      <dd className="m-0">{ROLES[cuenta.tipo_usuario] ?? cuenta.tipo_usuario}</dd>
      {cuenta.sede && (
        <>
          <dt className="text-[#a9afa7]">Sede (cliente)</dt>
          <dd className="m-0">{nombreSede(cuenta.sede)}</dd>
        </>
      )}
      {cuenta.sedes_administradas.length > 0 && (
        <>
          <dt className="text-[#a9afa7]">Administra</dt>
          <dd className="m-0">{cuenta.sedes_administradas.map(nombreSede).join(", ")}</dd>
        </>
      )}
      {cuenta.pagos_personales_aprobados > 0 && (
        <>
          <dt className="text-[#ffcf70]">Pagos personales</dt>
          <dd className="m-0 text-[#ffcf70]">
            {cuenta.pagos_personales_aprobados} aprobado(s). La política para
            suscripciones personales vigentes aún está pendiente.
          </dd>
        </>
      )}
    </dl>
  );
}
