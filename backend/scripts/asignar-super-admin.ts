/**
 * Asigna el rol super_admin a una cuenta real ya registrada y verificada.
 *
 * Es la única forma de crear un super_admin: la API nunca asigna ni
 * modifica ese rol. Lo ejecuta quien administra el servidor y la base, y
 * cada asignación queda en auditoria_roles (origen "cli", con motivo).
 *
 * Uso (dos pasos):
 *   1. Ver la cuenta, sin cambiar nada:
 *        npx tsx scripts/asignar-super-admin.ts --correo persona@ejemplo.com
 *   2. Confirmar con el id exacto que mostró el paso 1:
 *        npx tsx scripts/asignar-super-admin.ts --correo persona@ejemplo.com \
 *          --confirmar <usuarioId> --motivo "Primer super_admin del proyecto"
 *
 *   --adicional  permite asignar otro super_admin cuando ya existe uno.
 *
 * En esta etapa solo escribe en la base aislada de desarrollo jjgym_pagos
 * (127.0.0.1:55432). Requiere el mismo entorno que backend-local.sh
 * (DATABASE_URL local y la precarga del driver de Neon hacia PostgreSQL).
 */
import { parseArgs } from "node:util";

const BASE_PERMITIDA = { hosts: ["127.0.0.1", "localhost"], puerto: "55432", base: "jjgym_pagos" };

function salir(mensaje: string, codigo = 1): never {
  console.error(mensaje);
  process.exit(codigo);
}

// 1. Validar el destino ANTES de cargar el cliente de base de datos.
const url = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "");
  } catch {
    return salir("DATABASE_URL no está definida o no es válida.");
  }
})();
if (
  /neon\.tech/i.test(url.hostname) ||
  !BASE_PERMITIDA.hosts.includes(url.hostname) ||
  url.port !== BASE_PERMITIDA.puerto ||
  url.pathname !== `/${BASE_PERMITIDA.base}`
) {
  salir(
    `Destino rechazado: este script solo escribe en ${BASE_PERMITIDA.base} ` +
      `(127.0.0.1:${BASE_PERMITIDA.puerto}). Destino actual: ${url.hostname}:${url.port}${url.pathname}`
  );
}

const { values } = parseArgs({
  options: {
    correo: { type: "string" },
    confirmar: { type: "string" },
    motivo: { type: "string" },
    adicional: { type: "boolean", default: false },
  },
});

const { sanitizeEmail } = await import("../src/lib/sanitize.js");
const correo = sanitizeEmail(values.correo ?? "");
if (!correo) salir("Indica la cuenta con --correo <correo>.");

const { prisma } = await import("../src/lib/prisma.js");
const { gestionRepository } = await import("../src/repositories/gestion.repository.js");

try {
  // 2. Confirmar con la propia base a qué servidor se conectó.
  const [conexion] = await prisma.$queryRaw<{ base: string; puerto: number }[]>`
    SELECT current_database()::text AS base, inet_server_port()::int AS puerto`;
  if (conexion?.base !== BASE_PERMITIDA.base || String(conexion?.puerto) !== BASE_PERMITIDA.puerto) {
    salir(`La conexión no corresponde a ${BASE_PERMITIDA.base}:${BASE_PERMITIDA.puerto}. No se escribió nada.`);
  }
  console.log(`Base verificada: ${conexion.base} (puerto ${conexion.puerto}).\n`);

  // 3. Mostrar la cuenta para confirmarla.
  const cuenta = await gestionRepository.findCuentaPorCorreo(correo);
  if (!cuenta) salir("No existe una cuenta con ese correo. Debe registrarse primero (correo o Google).");

  console.log("Cuenta encontrada:");
  console.log(`  id:              ${cuenta.idusuario}`);
  console.log(`  nombre:          ${cuenta.nombres} ${cuenta.apellidos}`);
  console.log(`  correo:          ${cuenta.correo}`);
  console.log(`  proveedor:       ${cuenta.provider}`);
  console.log(`  verificada:      ${cuenta.email_verified ? "sí" : "no"}`);
  console.log(`  rol actual:      ${cuenta.tipo_usuario}`);
  console.log(`  sede (cliente):  ${cuenta.sede ?? "—"}`);
  console.log(`  sedes admin:     ${cuenta.sedes_administradas.join(", ") || "—"}`);
  console.log(`  pagos personales aprobados: ${cuenta.pagos_personales_aprobados}\n`);

  if (!values.confirmar) {
    console.log(
      "No se cambió nada. Si es la cuenta correcta, vuelve a ejecutar con:\n" +
        `  --confirmar ${cuenta.idusuario} --motivo "<por qué se asigna>"`
    );
    process.exit(0);
  }

  // 4. Validaciones antes de escribir.
  if (values.confirmar.toLowerCase() !== cuenta.idusuario) {
    salir("El id de --confirmar no corresponde a esa cuenta. No se cambió nada.");
  }
  const motivo = values.motivo?.trim() ?? "";
  if (motivo.length < 5 || motivo.length > 500) {
    salir("Indica un --motivo de 5 a 500 caracteres. Quedará en la auditoría.");
  }
  if (!cuenta.email_verified) salir("La cuenta no ha verificado su correo. No se cambió nada.");
  if (cuenta.tipo_usuario === "super_admin") salir("La cuenta ya es super_admin. No se cambió nada.", 0);
  const existentes = await gestionRepository.contarSuperAdmins();
  if (existentes > 0 && !values.adicional) {
    salir(`Ya existe ${existentes} super_admin. Usa --adicional si de verdad quieres otro.`);
  }

  // 5. Cambio y auditoría en una sola transacción.
  await gestionRepository.asignarSuperAdmin({
    usuarioId: cuenta.idusuario,
    rolAnterior: cuenta.tipo_usuario,
    sedesPrevias: cuenta.sede ? [cuenta.sede] : cuenta.sedes_administradas,
    motivo,
  });
  const registro = await prisma.auditoriaRol.findFirst({
    where: { usuarioId: cuenta.idusuario, accion: "asignar_super_admin" },
    orderBy: { creadoEn: "desc" },
    select: { id: true, rolAnterior: true, rolNuevo: true, creadoEn: true },
  });
  console.log(`Listo: ${cuenta.correo} ahora es super_admin (antes: ${cuenta.tipo_usuario}).`);
  console.log(`Auditoría: ${registro?.id} · ${registro?.creadoEn.toISOString()}`);
  console.log("La cuenta conserva sus credenciales; el nuevo rol aplica desde su próxima petición.");
} finally {
  await prisma.$disconnect();
}
