-- Pertenencia de clientes a una sede (miembros_sede) y auditoría de
-- cambios de rol y de sede (auditoria_roles). Solo crea tablas nuevas:
-- no modifica ni borra datos existentes.

-- CreateTable
CREATE TABLE "miembros_sede" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "gym_slug" VARCHAR(64) NOT NULL,
    "asignado_por" UUID,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "miembros_sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_roles" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "actor_id" UUID,
    "accion" VARCHAR(40) NOT NULL,
    "rol_anterior" VARCHAR(20) NOT NULL,
    "rol_nuevo" VARCHAR(20) NOT NULL,
    "gym_slugs" VARCHAR(64)[],
    "origen" VARCHAR(10) NOT NULL,
    "motivo" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "miembros_sede_usuario_id_key" ON "miembros_sede"("usuario_id");

-- CreateIndex
CREATE INDEX "miembros_sede_gym_slug_idx" ON "miembros_sede"("gym_slug");

-- CreateIndex
CREATE INDEX "auditoria_roles_usuario_id_idx" ON "auditoria_roles"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_roles_creado_en_idx" ON "auditoria_roles"("creado_en");

-- AddForeignKey
ALTER TABLE "miembros_sede" ADD CONSTRAINT "miembros_sede_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembros_sede" ADD CONSTRAINT "miembros_sede_asignado_por_fkey" FOREIGN KEY ("asignado_por") REFERENCES "usuarios"("idusuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_roles" ADD CONSTRAINT "auditoria_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_roles" ADD CONSTRAINT "auditoria_roles_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "usuarios"("idusuario") ON DELETE SET NULL ON UPDATE CASCADE;

