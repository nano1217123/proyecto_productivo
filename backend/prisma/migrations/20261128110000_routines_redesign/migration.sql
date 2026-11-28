ALTER TABLE "rutinas"
  ADD COLUMN "descripcion" TEXT,
  ADD COLUMN "objetivo" TEXT,
  ADD COLUMN "notas" TEXT,
  ADD COLUMN "dias" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "archivada" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "actualizado_en" TIMESTAMPTZ(6),
  ADD CONSTRAINT "rutinas_dias_validos" CHECK (
    cardinality("dias") <= 7 AND array_position("dias", NULL) IS NULL
    AND "dias" <@ ARRAY[1,2,3,4,5,6,7]
  );

CREATE INDEX "rutinas_usuario_id_archivada_idx" ON "rutinas"("usuario_id", "archivada");

ALTER TABLE "rutina_ejercicios"
  ADD COLUMN "repeticiones_max" INTEGER,
  ADD COLUMN "peso_kg" DOUBLE PRECISION,
  ADD COLUMN "asistencia_kg" DOUBLE PRECISION,
  ADD COLUMN "duracion_seg" INTEGER,
  ADD COLUMN "distancia_km" DOUBLE PRECISION,
  ADD COLUMN "notas" TEXT,
  ADD CONSTRAINT "rutina_ejercicios_objetivos_validos" CHECK (
    ("repeticiones_max" IS NULL OR ("repeticiones" IS NOT NULL AND "repeticiones_max" BETWEEN "repeticiones" AND 999))
    AND "peso_kg" BETWEEN 0 AND 1500
    AND "asistencia_kg" BETWEEN 0 AND 1500
    AND "duracion_seg" BETWEEN 1 AND 86400
    AND "distancia_km" BETWEEN 0 AND 1000
  );
