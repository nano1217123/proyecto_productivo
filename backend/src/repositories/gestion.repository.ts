// Repositorio de la gestión de roles y sedes.
// Cada cambio de rol se hace en una sola transacción junto con su registro
// en auditoria_roles. El rol solo cambia si sigue siendo el que se leyó al
// validar (UPDATE condicional): dos operaciones simultáneas no se pisan.
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { TipoUsuario } from "../types/usuario.types.js";
import type {
  AccionAuditoria,
  ClienteSede,
  OrigenAuditoria,
  VistaCuenta,
} from "../types/gestion.types.js";

const SELECT_CUENTA = {
  idusuario: true,
  nombres: true,
  apellidos: true,
  correo: true,
  provider: true,
  emailVerified: true,
  tipoUsuario: true,
  miembroSede: { select: { gymSlug: true } },
  adminSedes: { select: { gymSlug: true }, orderBy: { gymSlug: "asc" } },
} as const;

type FilaCuenta = {
  idusuario: string;
  nombres: string;
  apellidos: string;
  correo: string;
  provider: string;
  emailVerified: boolean;
  tipoUsuario: string;
  miembroSede: { gymSlug: string } | null;
  adminSedes: { gymSlug: string }[];
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const MSG_CAMBIO_CONCURRENTE =
  "La cuenta cambió mientras se procesaba la solicitud. Vuelve a buscarla e inténtalo de nuevo.";

function esViolacionUnica(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

async function cambiarRol(
  tx: Tx,
  usuarioId: string,
  rolAnterior: TipoUsuario,
  rolNuevo: TipoUsuario
): Promise<void> {
  const { count } = await tx.usuario.updateMany({
    where: { idusuario: usuarioId, tipoUsuario: rolAnterior },
    data: { tipoUsuario: rolNuevo },
  });
  if (count !== 1) throw new AppError(409, MSG_CAMBIO_CONCURRENTE);
}

async function auditar(
  tx: Tx,
  datos: {
    usuarioId: string;
    actorId: string | null;
    accion: AccionAuditoria;
    rolAnterior: TipoUsuario;
    rolNuevo: TipoUsuario;
    gymSlugs: string[];
    origen: OrigenAuditoria;
    motivo?: string | null;
  }
): Promise<void> {
  await tx.auditoriaRol.create({
    data: {
      usuarioId: datos.usuarioId,
      actorId: datos.actorId,
      accion: datos.accion,
      rolAnterior: datos.rolAnterior,
      rolNuevo: datos.rolNuevo,
      gymSlugs: datos.gymSlugs,
      origen: datos.origen,
      motivo: datos.motivo ?? null,
    },
  });
}

async function ejecutar<T>(operacion: () => Promise<T>, contexto: string): Promise<T> {
  try {
    return await operacion();
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (esViolacionUnica(error)) throw new AppError(409, MSG_CAMBIO_CONCURRENTE);
    console.error(`Error en ${contexto}:`, error);
    throw new AppError(500, "Error al actualizar la base de datos.");
  }
}

export function createGestionRepository(db: typeof prisma = prisma) {
  async function contarPagosPersonalesAprobados(usuarioId: string): Promise<number> {
    return db.pagoIntento.count({
      where: { usuarioId, plan: "suscripcion_particular", estado: "APROBADO" },
    });
  }

  async function aVista(fila: FilaCuenta): Promise<VistaCuenta> {
    return {
      idusuario: fila.idusuario,
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      correo: fila.correo,
      provider: fila.provider,
      email_verified: fila.emailVerified,
      tipo_usuario: fila.tipoUsuario as TipoUsuario,
      sede: fila.miembroSede?.gymSlug ?? null,
      sedes_administradas: fila.adminSedes.map((s) => s.gymSlug),
      pagos_personales_aprobados: await contarPagosPersonalesAprobados(fila.idusuario),
    };
  }

  return {
    // Cuenta por correo exacto (los correos se guardan en minúsculas).
    async findCuentaPorCorreo(correo: string): Promise<VistaCuenta | null> {
      return ejecutar(async () => {
        const fila = await db.usuario.findUnique({ where: { correo }, select: SELECT_CUENTA });
        return fila ? aVista(fila) : null;
      }, "la búsqueda de la cuenta");
    },

    async findCuentaPorId(usuarioId: string): Promise<VistaCuenta | null> {
      return ejecutar(async () => {
        const fila = await db.usuario.findUnique({ where: { idusuario: usuarioId }, select: SELECT_CUENTA });
        return fila ? aVista(fila) : null;
      }, "la consulta de la cuenta");
    },

    // Sede registrada de un cliente, o null.
    async findSedeDeCliente(usuarioId: string): Promise<string | null> {
      return ejecutar(async () => {
        const fila = await db.miembroSede.findUnique({ where: { usuarioId }, select: { gymSlug: true } });
        return fila?.gymSlug ?? null;
      }, "la consulta de la sede del cliente");
    },

    async administraSede(usuarioId: string, gymSlug: string): Promise<boolean> {
      return ejecutar(async () => {
        const fila = await db.adminSede.findUnique({
          where: { usuarioId_gymSlug: { usuarioId, gymSlug } },
          select: { id: true },
        });
        return fila !== null;
      }, "la verificación de la sede");
    },

    async listarClientesDeSede(gymSlug: string): Promise<ClienteSede[]> {
      return ejecutar(async () => {
        const filas = await db.miembroSede.findMany({
          where: { gymSlug },
          orderBy: { creadoEn: "desc" },
          select: {
            creadoEn: true,
            usuario: { select: { idusuario: true, nombres: true, apellidos: true, correo: true, provider: true } },
          },
        });
        return filas.map((f) => ({ ...f.usuario, vinculado_en: f.creadoEn }));
      }, "el listado de clientes");
    },

    // Cuentas con rol cliente que aún no tienen sede registrada (por
    // ejemplo, creadas antes de existir miembros_sede).
    async listarClientesSinSede(): Promise<ClienteSede[]> {
      return ejecutar(async () => {
        const filas = await db.usuario.findMany({
          where: { tipoUsuario: "cliente", miembroSede: { is: null } },
          orderBy: { tiempoRegistrado: "asc" },
          select: { idusuario: true, nombres: true, apellidos: true, correo: true, provider: true, tiempoRegistrado: true },
        });
        return filas.map(({ tiempoRegistrado, ...u }) => ({ ...u, vinculado_en: tiempoRegistrado }));
      }, "el listado de clientes sin sede");
    },

    // usuario_particular (o cliente sin sede) → cliente de gymSlug.
    async vincularCliente(datos: {
      usuarioId: string;
      rolAnterior: TipoUsuario;
      gymSlug: string;
      actorId: string;
    }): Promise<void> {
      await ejecutar(
        () =>
          db.$transaction(async (tx) => {
            // También si ya era cliente (sin sede): confirma que el rol no
            // cambió desde la validación.
            await cambiarRol(tx, datos.usuarioId, datos.rolAnterior, "cliente");
            // usuario_id es único: un cliente pertenece a una sola sede.
            await tx.miembroSede.create({
              data: { usuarioId: datos.usuarioId, gymSlug: datos.gymSlug, asignadoPor: datos.actorId },
            });
            await auditar(tx, {
              usuarioId: datos.usuarioId,
              actorId: datos.actorId,
              accion: "vincular_cliente",
              rolAnterior: datos.rolAnterior,
              rolNuevo: "cliente",
              gymSlugs: [datos.gymSlug],
              origen: "api",
            });
          }),
        "la vinculación del cliente"
      );
    },

    // Cliente de gymSlug → usuario_particular. Conserva sus pagos.
    async desvincularCliente(datos: {
      usuarioId: string;
      gymSlug: string;
      actorId: string;
    }): Promise<void> {
      await ejecutar(
        () =>
          db.$transaction(async (tx) => {
            const { count } = await tx.miembroSede.deleteMany({
              where: { usuarioId: datos.usuarioId, gymSlug: datos.gymSlug },
            });
            if (count !== 1) throw new AppError(409, MSG_CAMBIO_CONCURRENTE);
            await cambiarRol(tx, datos.usuarioId, "cliente", "usuario_particular");
            await auditar(tx, {
              usuarioId: datos.usuarioId,
              actorId: datos.actorId,
              accion: "desvincular_cliente",
              rolAnterior: "cliente",
              rolNuevo: "usuario_particular",
              gymSlugs: [datos.gymSlug],
              origen: "api",
            });
          }),
        "la desvinculación del cliente"
      );
    },

    // Asigna el rol admin con exactamente estas sedes. Si era cliente,
    // deja de pertenecer a su sede. Conserva sus pagos.
    async asignarAdmin(datos: {
      usuarioId: string;
      rolAnterior: TipoUsuario;
      gymSlugs: string[];
      actorId: string;
    }): Promise<void> {
      await ejecutar(
        () =>
          db.$transaction(async (tx) => {
            await cambiarRol(tx, datos.usuarioId, datos.rolAnterior, "admin");
            await tx.miembroSede.deleteMany({ where: { usuarioId: datos.usuarioId } });
            await tx.adminSede.deleteMany({
              where: { usuarioId: datos.usuarioId, gymSlug: { notIn: datos.gymSlugs } },
            });
            await tx.adminSede.createMany({
              data: datos.gymSlugs.map((gymSlug) => ({ usuarioId: datos.usuarioId, gymSlug })),
              skipDuplicates: true,
            });
            await auditar(tx, {
              usuarioId: datos.usuarioId,
              actorId: datos.actorId,
              accion: "asignar_admin",
              rolAnterior: datos.rolAnterior,
              rolNuevo: "admin",
              gymSlugs: datos.gymSlugs,
              origen: "api",
            });
          }),
        "la asignación del administrador"
      );
    },

    // Solo lo usa el script del servidor (scripts/asignar-super-admin.ts).
    // Quita la pertenencia de cliente y las sedes administradas, que no
    // aplican a un super_admin; quedan anotadas en la auditoría.
    async asignarSuperAdmin(datos: {
      usuarioId: string;
      rolAnterior: TipoUsuario;
      sedesPrevias: string[];
      motivo: string;
    }): Promise<void> {
      await ejecutar(
        () =>
          db.$transaction(async (tx) => {
            await cambiarRol(tx, datos.usuarioId, datos.rolAnterior, "super_admin");
            await tx.miembroSede.deleteMany({ where: { usuarioId: datos.usuarioId } });
            await tx.adminSede.deleteMany({ where: { usuarioId: datos.usuarioId } });
            await auditar(tx, {
              usuarioId: datos.usuarioId,
              actorId: null,
              accion: "asignar_super_admin",
              rolAnterior: datos.rolAnterior,
              rolNuevo: "super_admin",
              gymSlugs: datos.sedesPrevias,
              origen: "cli",
              motivo: datos.motivo,
            });
          }),
        "la asignación de super_admin"
      );
    },

    async contarSuperAdmins(): Promise<number> {
      return ejecutar(() => db.usuario.count({ where: { tipoUsuario: "super_admin" } }), "el conteo de super_admin");
    },
  };
}

export type GestionRepository = ReturnType<typeof createGestionRepository>;
export const gestionRepository = createGestionRepository();
