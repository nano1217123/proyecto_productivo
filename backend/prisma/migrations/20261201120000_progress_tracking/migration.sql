ALTER TABLE "usuarios" ADD COLUMN "altura_cm" integer CHECK ("altura_cm" > 0 AND "altura_cm" <= 300);
ALTER TABLE "metricas_diarias" ADD COLUMN "peso_actualizado_en" timestamptz;
CREATE INDEX "metricas_diarias_usuario_id_fecha_id_idx" ON "metricas_diarias" ("usuario_id", "fecha" DESC, "id" DESC);
