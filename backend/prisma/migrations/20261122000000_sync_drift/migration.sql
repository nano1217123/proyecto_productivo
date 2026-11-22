-- Sincroniza las migraciones con cambios que ya existen en Neon pero que
-- se aplicaron fuera de prisma/migrations (db push / SQL manual).
-- Es idempotente: en Neon no cambia nada; en una base nueva crea lo que falta.

-- ejercicios: URLs de imagen y video
ALTER TABLE "ejercicios" ADD COLUMN IF NOT EXISTS "imagen_url" TEXT;
ALTER TABLE "ejercicios" ADD COLUMN IF NOT EXISTS "video_url" TEXT;

-- resenas: comentario pasa de VARCHAR(1000) a TEXT (sin perdida de datos)
ALTER TABLE "resenas" ALTER COLUMN "comentario" SET DATA TYPE TEXT;

-- metricas_diarias
CREATE TABLE IF NOT EXISTS "metricas_diarias" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "peso_actual_kg" DOUBLE PRECISION,
    "vasos_agua" INTEGER NOT NULL DEFAULT 0,
    "entrenamiento_completado" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "metricas_diarias_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'metricas_diarias_usuario_id_fkey'
    ) THEN
        ALTER TABLE "metricas_diarias"
            ADD CONSTRAINT "metricas_diarias_usuario_id_fkey"
            FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
