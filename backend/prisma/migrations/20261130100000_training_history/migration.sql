ALTER TABLE "entrenamientos"
  ADD COLUMN "rutina_origen" JSONB,
  ADD COLUMN "catalogo_historico" JSONB,
  ADD COLUMN "actualizado_en" TIMESTAMPTZ(6);
