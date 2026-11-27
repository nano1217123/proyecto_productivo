import { randomUUID } from "node:crypto";
import type { RequestHandler, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { insertarEventoReporte, type IdentidadReporte, type AlcanceReporte,
  type EventoReporte } from "../repositories/auditoriaReportes.repository.js";

const rechazos: Partial<Record<number, EventoReporte["resultado"]>> = {
  400: "invalidacion", 401: "sin_permiso", 403: "sin_permiso", 404: "no_encontrado", 422: "no_procesable", 429: "cuota",
};

type Auditoria = {
  generar: (alcance: AlcanceReporte) => Promise<void>;
};
const auditorias = new WeakMap<Response, Auditoria>();

export function auditarReporte(tipo: IdentidadReporte["tipo"], formato: IdentidadReporte["formato"]): RequestHandler {
  return (req, res, next) => {
    if (!req.userId) return next(new AppError(401, "No autorizado."));
    const identidad = { solicitudId: randomUUID(), actorId: req.userId, tipo, formato };
    let alcance: AlcanceReporte | null = null;
    let generacion: Promise<void> | undefined;
    let falloAuditoria = false;
    let generado = false;
    let terminal = false;
    const registrar = (datos: EventoReporte, instante: Date) =>
      insertarEventoReporte(identidad, alcance, datos, instante);

    auditorias.set(res, {
      async generar(autorizado) {
        if (terminal) return;
        alcance = autorizado;
        generacion = registrar({ evento: "archivo_generado", resultado: "ok" }, new Date());
        try {
          await generacion;
          generado = true;
        } catch {
          falloAuditoria = true;
          console.error("[reportes.auditoria] persistencia_obligatoria_fallida", identidad.solicitudId);
          throw new AppError(503, "No se pudo registrar la descarga. Intenta de nuevo más tarde.");
        }
      },
    });

    function cerrar(interrumpida: boolean) {
      if (terminal) return;
      terminal = true;
      res.off("finish", finalizar);
      res.off("close", desconectar);
      const instante = new Date();
      const status = res.statusCode;
      void (async () => {
        await generacion?.catch(() => {});
        const evento: EventoReporte = interrumpida
          ? { evento: "respuesta_interrumpida", resultado: "conexion_cerrada" }
          : falloAuditoria
            ? { evento: "error_generacion", resultado: "auditoria_no_disponible" }
            : status >= 500
              ? { evento: "error_generacion", resultado: "error_interno" }
              : status >= 400
                ? { evento: "solicitud_rechazada", resultado: rechazos[status] ?? "otro_rechazo" }
                : { evento: "respuesta_finalizada", resultado: generado && req.method !== "HEAD" && status === 200
                  ? "ok" : "sin_cuerpo" };
        await registrar(evento, instante);
      })().catch(() => console.error("[reportes.auditoria] persistencia_terminal_fallida", identidad.solicitudId));
    }
    function finalizar() { cerrar(false); }
    function desconectar() { cerrar(!res.writableFinished); }
    res.once("finish", finalizar);
    res.once("close", desconectar);
    next();
  };
}

export async function auditarArchivoGenerado(res: Response, alcance: AlcanceReporte) {
  const auditoria = auditorias.get(res);
  if (!auditoria) throw new AppError(503, "No se pudo registrar la descarga.");
  await auditoria.generar(alcance);
  return !res.destroyed && !res.writableEnded;
}
