ALTER TABLE "entrenamientos"
  ADD COLUMN "nombre" TEXT,
  ADD COLUMN "estado" TEXT NOT NULL DEFAULT 'finalizado',
  ADD COLUMN "iniciado_en" TIMESTAMPTZ(6),
  ADD COLUMN "finalizado_en" TIMESTAMPTZ(6),
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sesion" JSONB,
  ADD CONSTRAINT "entrenamientos_estado_check" CHECK ("estado" IN ('en_curso', 'finalizado', 'cancelado'));

CREATE UNIQUE INDEX "entrenamientos_activo_por_usuario"
  ON "entrenamientos" ("usuario_id") WHERE "estado" = 'en_curso';
CREATE INDEX "entrenamientos_usuario_id_estado_fecha_creado_en_idx"
  ON "entrenamientos" ("usuario_id", "estado", "fecha", "creado_en");

ALTER TABLE "series_entrenamiento"
  ALTER COLUMN "repeticiones" DROP NOT NULL,
  ADD COLUMN "tipo" TEXT,
  ADD COLUMN "duracion_seg" INTEGER,
  ADD COLUMN "distancia_km" DECIMAL,
  ADD COLUMN "asistencia_kg" DECIMAL;

CREATE INDEX "series_entrenamiento_usuario_id_ejercicio_id_idx"
  ON "series_entrenamiento" ("usuario_id", "ejercicio_id");
CREATE INDEX "series_entrenamiento_entrenamiento_id_idx"
  ON "series_entrenamiento" ("entrenamiento_id");
