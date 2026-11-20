-- CreateTable
CREATE TABLE "resenas" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "gym_slug" VARCHAR NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentario" VARCHAR(1000) NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resenas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resenas_usuario_id_idx" ON "resenas"("usuario_id");

-- CreateIndex
CREATE INDEX "resenas_gym_slug_creado_en_idx" ON "resenas"("gym_slug", "creado_en");

-- AddForeignKey
ALTER TABLE "resenas"
ADD CONSTRAINT "resenas_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario")
ON DELETE CASCADE ON UPDATE CASCADE;