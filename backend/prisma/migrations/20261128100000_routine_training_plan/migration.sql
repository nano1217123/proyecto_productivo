ALTER TABLE "rutina_ejercicios"
  ADD COLUMN "tipo" TEXT,
  ADD COLUMN "series" INTEGER CHECK ("series" BETWEEN 1 AND 30),
  ADD COLUMN "repeticiones" INTEGER CHECK ("repeticiones" BETWEEN 1 AND 999),
  ADD COLUMN "descanso" INTEGER CHECK ("descanso" BETWEEN 0 AND 3600);
