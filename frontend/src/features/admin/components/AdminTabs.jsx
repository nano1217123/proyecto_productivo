"use client";

import { pestanasAdmin } from "../lib/adminTabs.js";

export default function AdminTabs({ tabActiva, setTabActiva, esSuperAdmin, esAdmin }) {
  const pestanas = pestanasAdmin({ esAdmin, esSuperAdmin });

  return (
    <nav aria-label="Secciones del panel" className="flex flex-wrap gap-2.5 mb-6 border-b border-[#30332f] pb-3">
      {pestanas.map(({ id, etiqueta, pronto }) => {
        const activa = tabActiva === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={activa ? "page" : undefined}
            onClick={() => setTabActiva(id)}
            className={`inline-flex items-center gap-2 px-[18px] py-2.5 rounded-lg border font-bold cursor-pointer transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff] ${
              activa
                ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]"
                : "border-[#41463f] bg-[#151714] text-[#a9afa7] hover:text-[#f2f4ef]"
            }`}
          >
            {etiqueta}
            {pronto && (
              <span className="px-1.5 py-0.5 rounded border border-[rgba(255,196,87,.45)] text-[#ffcf70] text-[10px] font-extrabold tracking-wider uppercase">
                Pronto
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
