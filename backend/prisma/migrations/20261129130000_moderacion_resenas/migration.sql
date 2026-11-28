-- CreateEnum
CREATE TYPE "VisibilidadResena" AS ENUM ('VISIBLE', 'OCULTA');

-- CreateEnum
CREATE TYPE "MotivoDenunciaResena" AS ENUM ('ACOSO', 'SPAM', 'DATOS_PERSONALES', 'FRAUDE', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoDenunciaResena" AS ENUM ('PENDIENTE', 'DERIVADA', 'RESUELTA');

-- CreateEnum
CREATE TYPE "AccionModeracionResena" AS ENUM ('DERIVAR', 'RESOLVER', 'OCULTAR', 'RESTAURAR');

-- CreateEnum
CREATE TYPE "MotivoModeracionResena" AS ENUM ('ACOSO', 'SPAM', 'DATOS_PERSONALES', 'FRAUDE', 'SIN_INFRACCION', 'CONTENIDO_CORREGIDO', 'REQUIERE_REVISION');

-- AlterTable
ALTER TABLE "resenas" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "visibilidad" "VisibilidadResena" NOT NULL DEFAULT 'VISIBLE';

-- CreateTable
CREATE TABLE "denuncias_resenas" (
    "id" UUID NOT NULL,
    "resena_id" UUID,
    "gym_slug" VARCHAR(64) NOT NULL,
    "motivo" "MotivoDenunciaResena" NOT NULL,
    "estado" "EstadoDenunciaResena" NOT NULL DEFAULT 'PENDIENTE',
    "revision" INTEGER NOT NULL,
    "prioritaria" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisar_en" TIMESTAMPTZ(6) NOT NULL,
    "resuelto_en" TIMESTAMPTZ(6),
    "eliminar_en" TIMESTAMPTZ(6),

    CONSTRAINT "denuncias_resenas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "denuncias_resenas_privadas" (
    "denuncia_id" UUID NOT NULL,
    "resena_id" UUID NOT NULL,
    "denunciante_id" UUID NOT NULL,
    "descripcion" VARCHAR(500),
    "vencer_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "denuncias_resenas_privadas_pkey" PRIMARY KEY ("denuncia_id")
);

-- CreateTable
CREATE TABLE "decisiones_moderacion_resenas" (
    "id" UUID NOT NULL,
    "denuncia_id" UUID,
    "resena_id" UUID,
    "actor_id" UUID,
    "gym_slug" VARCHAR(64) NOT NULL,
    "accion" "AccionModeracionResena" NOT NULL,
    "motivo" "MotivoModeracionResena" NOT NULL,
    "anterior" "VisibilidadResena",
    "posterior" "VisibilidadResena",
    "estado" "EstadoDenunciaResena",
    "revision" INTEGER,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminar_en" TIMESTAMPTZ(6),

    CONSTRAINT "decisiones_moderacion_resenas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "denuncias_resenas_gym_slug_estado_creado_en_idx" ON "denuncias_resenas"("gym_slug", "estado", "creado_en");

-- CreateIndex
CREATE INDEX "denuncias_resenas_resena_id_idx" ON "denuncias_resenas"("resena_id");

-- CreateIndex
CREATE INDEX "denuncias_resenas_estado_revisar_en_idx" ON "denuncias_resenas"("estado", "revisar_en");

-- CreateIndex
CREATE INDEX "denuncias_resenas_eliminar_en_idx" ON "denuncias_resenas"("eliminar_en");

-- CreateIndex
CREATE INDEX "denuncias_resenas_privadas_denunciante_id_idx" ON "denuncias_resenas_privadas"("denunciante_id");

-- CreateIndex
CREATE INDEX "denuncias_resenas_privadas_vencer_en_idx" ON "denuncias_resenas_privadas"("vencer_en");

-- CreateIndex
CREATE UNIQUE INDEX "denuncias_resenas_privadas_resena_id_denunciante_id_key" ON "denuncias_resenas_privadas"("resena_id", "denunciante_id");

-- CreateIndex
CREATE INDEX "decisiones_moderacion_resenas_denuncia_id_creado_en_idx" ON "decisiones_moderacion_resenas"("denuncia_id", "creado_en");

-- CreateIndex
CREATE INDEX "decisiones_moderacion_resenas_resena_id_creado_en_idx" ON "decisiones_moderacion_resenas"("resena_id", "creado_en");

-- CreateIndex
CREATE INDEX "decisiones_moderacion_resenas_actor_id_idx" ON "decisiones_moderacion_resenas"("actor_id");

-- CreateIndex
CREATE INDEX "decisiones_moderacion_resenas_eliminar_en_idx" ON "decisiones_moderacion_resenas"("eliminar_en");

-- CreateIndex
CREATE INDEX "resenas_visibilidad_gym_slug_creado_en_idx" ON "resenas"("visibilidad", "gym_slug", "creado_en");

-- AddForeignKey
ALTER TABLE "denuncias_resenas" ADD CONSTRAINT "denuncias_resenas_resena_id_fkey" FOREIGN KEY ("resena_id") REFERENCES "resenas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denuncias_resenas_privadas" ADD CONSTRAINT "denuncias_resenas_privadas_denuncia_id_fkey" FOREIGN KEY ("denuncia_id") REFERENCES "denuncias_resenas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denuncias_resenas_privadas" ADD CONSTRAINT "denuncias_resenas_privadas_resena_id_fkey" FOREIGN KEY ("resena_id") REFERENCES "resenas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denuncias_resenas_privadas" ADD CONSTRAINT "denuncias_resenas_privadas_denunciante_id_fkey" FOREIGN KEY ("denunciante_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisiones_moderacion_resenas" ADD CONSTRAINT "decisiones_moderacion_resenas_denuncia_id_fkey" FOREIGN KEY ("denuncia_id") REFERENCES "denuncias_resenas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisiones_moderacion_resenas" ADD CONSTRAINT "decisiones_moderacion_resenas_resena_id_fkey" FOREIGN KEY ("resena_id") REFERENCES "resenas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisiones_moderacion_resenas" ADD CONSTRAINT "decisiones_moderacion_resenas_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "usuarios"("idusuario") ON DELETE SET NULL ON UPDATE CASCADE;

