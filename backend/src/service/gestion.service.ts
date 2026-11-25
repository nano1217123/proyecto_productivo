// Reglas de la gestión de roles y sedes.
//
// - Cliente: lo vincula o desvincula el admin de esa sede o un super_admin.
//   Cada cliente pertenece a una sola sede; al desvincularlo vuelve a
//   usuario_particular.
// - Admin: lo asigna un super_admin (POST /api/auth/create-admin) sobre una
//   cuenta existente y verificada, con sus sedes, en una sola transacción.
// - super_admin: nunca se asigna ni se modifica por la API; solo con el
//   script del servidor scripts/asignar-super-admin.ts.
//
// Todas las operaciones confirman la cuenta con su id y su correo, y dejan
// registro en auditoria_roles. Los intentos y el historial de pagos de la
// cuenta se conservan siempre.
//
// Suscripciones personales: hoy no existe un mecanismo que determine si una
// suscripción personal está activa (el webhook solo actualiza el intento de
// pago). Por eso el cambio no se bloquea; la vista de la cuenta informa los
// pagos personales aprobados. Ver BACKEND.md antes de habilitar este flujo
// en una base compartida.
import { AppError } from "../errors/AppError.js";
import { esSedeValida, SEDES } from "../lib/sedes.js";
import {
  gestionRepository,
  type GestionRepository,
} from "../repositories/gestion.repository.js";
import type {
  ActorGestion,
  AsignarAdminInput,
  ClienteSede,
  CuentaConfirmada,
  VistaCuenta,
} from "../types/gestion.types.js";

const MSG_NO_ENCONTRADA = "No encontramos una cuenta con ese correo.";

export function createGestionService(repository: GestionRepository = gestionRepository) {
  // El admin solo opera sobre sedes que administra; el super_admin, sobre
  // cualquier sede del catálogo.
  async function autorizarSede(actor: ActorGestion, gymSlug: string): Promise<void> {
    if (!esSedeValida(gymSlug)) throw new AppError(404, "Sede no encontrada.");
    if (actor.rol === "super_admin") return;
    if (actor.rol === "admin" && (await repository.administraSede(actor.id, gymSlug))) return;
    throw new AppError(403, "No administras esta sede.");
  }

  // Carga la cuenta elegida y comprueba que id y correo sean de la misma
  // cuenta, que esté verificada y que no sea la del propio actor.
  async function cargarCuentaConfirmada(
    actor: ActorGestion,
    seleccion: CuentaConfirmada
  ): Promise<VistaCuenta> {
    const cuenta = await repository.findCuentaPorId(seleccion.usuarioId);
    if (!cuenta || cuenta.correo !== seleccion.correo) {
      throw new AppError(409, "El correo no coincide con la cuenta seleccionada. Vuelve a buscarla.");
    }
    if (cuenta.idusuario === actor.id) {
      throw new AppError(400, "No puedes cambiar el rol de tu propia cuenta.");
    }
    if (!cuenta.email_verified) {
      throw new AppError(409, "La cuenta aún no ha verificado su correo.");
    }
    return cuenta;
  }

  return {
    catalogoSedes() {
      return SEDES.map(({ slug, nombre, ubicacion }) => ({ slug, nombre, ubicacion }));
    },

    // Vista previa por correo exacto, para confirmar la cuenta antes de
    // vincularla o promoverla.
    async buscarCuenta(correo: string): Promise<VistaCuenta> {
      const cuenta = await repository.findCuentaPorCorreo(correo);
      if (!cuenta) throw new AppError(404, MSG_NO_ENCONTRADA);
      return cuenta;
    },

    async listarClientes(actor: ActorGestion, gymSlug: string): Promise<ClienteSede[]> {
      await autorizarSede(actor, gymSlug);
      return repository.listarClientesDeSede(gymSlug);
    },

    async listarClientesSinSede(): Promise<ClienteSede[]> {
      return repository.listarClientesSinSede();
    },

    async vincularCliente(
      actor: ActorGestion,
      gymSlug: string,
      seleccion: CuentaConfirmada
    ): Promise<VistaCuenta> {
      await autorizarSede(actor, gymSlug);
      const cuenta = await cargarCuentaConfirmada(actor, seleccion);

      if (cuenta.tipo_usuario === "cliente" && cuenta.sede === gymSlug) {
        throw new AppError(409, "Esta cuenta ya es cliente de esta sede.");
      }
      if (cuenta.tipo_usuario === "cliente" && cuenta.sede) {
        throw new AppError(
          409,
          "Esta cuenta ya pertenece a otra sede. Primero debe desvincularla su sede actual o un super_admin."
        );
      }
      if (cuenta.tipo_usuario !== "usuario_particular" && cuenta.tipo_usuario !== "cliente") {
        throw new AppError(
          409,
          "Solo se pueden vincular cuentas de usuario particular o clientes sin sede."
        );
      }

      await repository.vincularCliente({
        usuarioId: cuenta.idusuario,
        rolAnterior: cuenta.tipo_usuario,
        gymSlug,
        actorId: actor.id,
      });
      return (await repository.findCuentaPorId(cuenta.idusuario)) as VistaCuenta;
    },

    async desvincularCliente(actor: ActorGestion, gymSlug: string, usuarioId: string): Promise<void> {
      await autorizarSede(actor, gymSlug);
      const sede = await repository.findSedeDeCliente(usuarioId);
      if (sede !== gymSlug) {
        throw new AppError(404, "Ese cliente no pertenece a esta sede.");
      }
      await repository.desvincularCliente({ usuarioId, gymSlug, actorId: actor.id });
    },

    // POST /api/auth/create-admin (solo super_admin). Asigna el rol admin y
    // exactamente estas sedes. Nunca crea cuentas ni toca un super_admin.
    async asignarAdmin(actor: ActorGestion, input: AsignarAdminInput) {
      if (actor.rol !== "super_admin") {
        throw new AppError(403, "Solo un super_admin puede asignar administradores.");
      }
      const cuenta = await cargarCuentaConfirmada(actor, input);
      if (cuenta.tipo_usuario === "super_admin") {
        throw new AppError(409, "Las cuentas super_admin no se modifican desde este panel.");
      }
      if (!["usuario_particular", "cliente", "admin"].includes(cuenta.tipo_usuario)) {
        throw new AppError(409, "Esta cuenta no puede recibir el rol de administrador.");
      }

      await repository.asignarAdmin({
        usuarioId: cuenta.idusuario,
        rolAnterior: cuenta.tipo_usuario,
        gymSlugs: input.gymSlugs,
        actorId: actor.id,
      });
      return {
        message:
          cuenta.tipo_usuario === "admin"
            ? "Sedes del administrador actualizadas."
            : "Rol de administrador asignado.",
        userId: cuenta.idusuario,
        sedes: input.gymSlugs,
      };
    },
  };
}

export type GestionService = ReturnType<typeof createGestionService>;
export const gestionService = createGestionService();
