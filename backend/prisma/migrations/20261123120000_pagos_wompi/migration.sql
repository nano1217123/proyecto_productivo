-- Módulo de pagos (Wompi) · paso 1: inicio del pago.
-- Crea la asignación admin -> sede y el registro de intentos de pago.

-- CreateTable
CREATE TABLE "admin_sedes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "gym_slug" VARCHAR(64) NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_intentos" (
    "id" UUID NOT NULL,
    "referencia" VARCHAR(64) NOT NULL,
    "proveedor" VARCHAR(20) NOT NULL DEFAULT 'wompi',
    "plan" VARCHAR(40) NOT NULL,
    "usuario_id" UUID NOT NULL,
    "gym_slug" VARCHAR(64),
    "monto_en_centavos" INTEGER NOT NULL,
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'COP',
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pagos_intentos_pkey" PRIMARY KEY ("id"),
    -- El importe siempre es positivo.
    CONSTRAINT "pagos_intentos_monto_positivo" CHECK ("monto_en_centavos" > 0),
    -- La suscripción de sede siempre lleva sede; la particular nunca.
    CONSTRAINT "pagos_intentos_titular_valido" CHECK (
        ("plan" = 'suscripcion_sede' AND "gym_slug" IS NOT NULL)
        OR ("plan" = 'suscripcion_particular' AND "gym_slug" IS NULL)
    )
);

-- CreateIndex
CREATE INDEX "admin_sedes_gym_slug_idx" ON "admin_sedes"("gym_slug");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sedes_usuario_id_gym_slug_key" ON "admin_sedes"("usuario_id", "gym_slug");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_intentos_referencia_key" ON "pagos_intentos"("referencia");

-- CreateIndex
CREATE INDEX "pagos_intentos_usuario_id_idx" ON "pagos_intentos"("usuario_id");

-- CreateIndex
CREATE INDEX "pagos_intentos_gym_slug_idx" ON "pagos_intentos"("gym_slug");

-- AddForeignKey
ALTER TABLE "admin_sedes" ADD CONSTRAINT "admin_sedes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_intentos" ADD CONSTRAINT "pagos_intentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE RESTRICT ON UPDATE CASCADE;
