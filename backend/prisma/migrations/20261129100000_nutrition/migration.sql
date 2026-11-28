CREATE TABLE "nutricion_perfiles" (
    "usuario_id" UUID NOT NULL,
    "birth_year" INTEGER NOT NULL,
    "activity" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "preference" TEXT NOT NULL,
    "allergens" TEXT[],
    "needs_professional" BOOLEAN NOT NULL,
    "tracking" BOOLEAN NOT NULL DEFAULT true,
    "zone" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "nutricion_perfiles_pkey" PRIMARY KEY ("usuario_id")
);

CREATE TABLE "nutricion_referencias" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goal" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "minimum" INTEGER,
    "maximum" INTEGER,
    "method" TEXT NOT NULL,

    CONSTRAINT "nutricion_referencias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nutricion_registros" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "food_id" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "meal" TEXT,
    "day" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "nutricion_registros_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nutricion_favoritos" (
    "usuario_id" UUID NOT NULL,
    "food_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutricion_favoritos_pkey" PRIMARY KEY ("usuario_id","food_id")
);

CREATE INDEX "nutricion_referencias_usuario_id_day_created_at_id_idx" ON "nutricion_referencias"("usuario_id", "day", "created_at", "id");

CREATE INDEX "nutricion_registros_usuario_id_day_created_at_idx" ON "nutricion_registros"("usuario_id", "day", "created_at");

ALTER TABLE "nutricion_perfiles" ADD CONSTRAINT "nutricion_perfiles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nutricion_referencias" ADD CONSTRAINT "nutricion_referencias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nutricion_registros" ADD CONSTRAINT "nutricion_registros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nutricion_favoritos" ADD CONSTRAINT "nutricion_favoritos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nutricion_registros" ADD CHECK (quantity > 0 AND grams BETWEEN 0.01 AND 10000 AND protein >= 0 AND protein <= grams);
ALTER TABLE "nutricion_referencias" ADD CHECK ((minimum IS NULL AND maximum IS NULL) OR (minimum > 0 AND maximum >= minimum));
