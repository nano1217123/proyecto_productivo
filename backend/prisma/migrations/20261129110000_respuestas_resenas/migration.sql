CREATE TABLE "respuestas_resenas" (
    "resena_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,
    "creado_por_id" UUID,
    "actualizado_por_id" UUID,
    "eliminado_en" TIMESTAMPTZ(6),
    "eliminado_por_id" UUID,

    CONSTRAINT "respuestas_resenas_pkey" PRIMARY KEY ("resena_id")
);

CREATE INDEX "respuestas_resenas_creado_por_id_idx" ON "respuestas_resenas"("creado_por_id");
CREATE INDEX "respuestas_resenas_actualizado_por_id_idx" ON "respuestas_resenas"("actualizado_por_id");
CREATE INDEX "respuestas_resenas_eliminado_por_id_idx" ON "respuestas_resenas"("eliminado_por_id");

ALTER TABLE "respuestas_resenas" ADD CONSTRAINT "respuestas_resenas_resena_id_fkey"
    FOREIGN KEY ("resena_id") REFERENCES "resenas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "respuestas_resenas" ADD CONSTRAINT "respuestas_resenas_creado_por_id_fkey"
    FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("idusuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "respuestas_resenas" ADD CONSTRAINT "respuestas_resenas_actualizado_por_id_fkey"
    FOREIGN KEY ("actualizado_por_id") REFERENCES "usuarios"("idusuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "respuestas_resenas" ADD CONSTRAINT "respuestas_resenas_eliminado_por_id_fkey"
    FOREIGN KEY ("eliminado_por_id") REFERENCES "usuarios"("idusuario") ON DELETE SET NULL ON UPDATE CASCADE;
