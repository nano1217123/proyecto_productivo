-- Suscripción SaaS mensual por sede (RF-013 / RN-012).
-- Migración aditiva: crea tablas y columnas nuevas y no modifica ni borra
-- datos existentes. Los intentos de pago históricos quedan como están.

-- Ambiente de Wompi en el que se creó cada intento. Hasta ahora el backend
-- solo admite llaves de Sandbox, así que los intentos existentes son 'test'.
ALTER TABLE "pagos_intentos"
    ADD COLUMN "ambiente" VARCHAR(10) NOT NULL DEFAULT 'test';

ALTER TABLE "pagos_intentos"
    ADD CONSTRAINT "pagos_intentos_ambiente_valido" CHECK ("ambiente" IN ('test', 'prod'));

-- Destino de las claves foráneas compuestas de los períodos: obliga a que
-- un período use la sede y el plan del intento que lo pagó.
CREATE UNIQUE INDEX "pagos_intentos_id_gym_slug_plan_key"
    ON "pagos_intentos"("id", "gym_slug", "plan");

-- Estado actual de la suscripción de cada sede. La fila también sirve de
-- cerrojo: cada pago de la sede la bloquea (SELECT ... FOR UPDATE) antes de
-- calcular su período, así que dos pagos simultáneos se encadenan.
CREATE TABLE "suscripciones_sede" (
    "gym_slug" VARCHAR(64) NOT NULL,
    -- Fin del período vigente. Sin períodos concedidos, todo es NULL.
    "vigente_hasta" TIMESTAMPTZ(6),
    -- Día del mes (hora de Colombia) en el que vence la suscripción. Lo fija
    -- la activación o la reactivación y mantiene ese día al renovar.
    "dia_corte" SMALLINT,
    "ultimo_pago_id" UUID,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suscripciones_sede_pkey" PRIMARY KEY ("gym_slug"),
    CONSTRAINT "suscripciones_sede_dia_corte_valido" CHECK ("dia_corte" BETWEEN 1 AND 31),
    CONSTRAINT "suscripciones_sede_completa" CHECK (
        ("vigente_hasta" IS NULL AND "dia_corte" IS NULL AND "ultimo_pago_id" IS NULL)
        OR ("vigente_hasta" IS NOT NULL AND "dia_corte" IS NOT NULL AND "ultimo_pago_id" IS NOT NULL)
    )
);

-- Un período mensual por pago aprobado: historial de activaciones y
-- renovaciones de cada sede.
CREATE TABLE "suscripciones_sede_periodos" (
    "id" UUID NOT NULL,
    "gym_slug" VARCHAR(64) NOT NULL,
    "plan" VARCHAR(40) NOT NULL DEFAULT 'suscripcion_sede',
    "pago_id" UUID NOT NULL,
    "wompi_transaccion_id" VARCHAR(64) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    -- Momento de aprobación según Wompi (finalized_at verificado).
    "aprobado_en" TIMESTAMPTZ(6) NOT NULL,
    "desde" TIMESTAMPTZ(6) NOT NULL,
    "hasta" TIMESTAMPTZ(6) NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suscripciones_sede_periodos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "suscripciones_sede_periodos_plan_sede" CHECK ("plan" = 'suscripcion_sede'),
    CONSTRAINT "suscripciones_sede_periodos_tipo_valido" CHECK ("tipo" IN ('activacion', 'renovacion', 'reactivacion')),
    CONSTRAINT "suscripciones_sede_periodos_rango_valido" CHECK ("hasta" > "desde")
);

-- Un mismo pago concede vigencia una sola vez.
CREATE UNIQUE INDEX "suscripciones_sede_periodos_pago_id_key"
    ON "suscripciones_sede_periodos"("pago_id");

-- Dos períodos de la misma sede no pueden empezar en el mismo instante:
-- si dos pagos calcularan el mismo período, el segundo falla en lugar de
-- solaparse y perder una renovación.
CREATE UNIQUE INDEX "suscripciones_sede_periodos_gym_slug_desde_key"
    ON "suscripciones_sede_periodos"("gym_slug", "desde");

CREATE INDEX "suscripciones_sede_periodos_gym_slug_hasta_idx"
    ON "suscripciones_sede_periodos"("gym_slug", "hasta");

-- Evidencia de transacciones aprobadas que no concedieron vigencia (por
-- ejemplo, una segunda aprobación de Wompi para la misma referencia).
CREATE TABLE "pagos_transacciones_revision" (
    "id" UUID NOT NULL,
    "pago_id" UUID NOT NULL,
    "wompi_transaccion_id" VARCHAR(64) NOT NULL,
    -- Transacción que sí quedó asociada al intento.
    "transaccion_aplicada_id" VARCHAR(64),
    "motivo" VARCHAR(40) NOT NULL,
    "origen" VARCHAR(40) NOT NULL,
    "detectado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_transacciones_revision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pagos_transacciones_revision_motivo_valido" CHECK ("motivo" IN ('segunda_aprobacion'))
);

CREATE UNIQUE INDEX "pagos_transacciones_revision_pago_id_wompi_transaccion_id_key"
    ON "pagos_transacciones_revision"("pago_id", "wompi_transaccion_id");

-- AddForeignKey: los registros de pago no se borran mientras haya vigencia
-- o evidencia que los use.
ALTER TABLE "suscripciones_sede" ADD CONSTRAINT "suscripciones_sede_ultimo_pago_id_fkey"
    FOREIGN KEY ("ultimo_pago_id") REFERENCES "pagos_intentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "suscripciones_sede_periodos" ADD CONSTRAINT "suscripciones_sede_periodos_pago_fkey"
    FOREIGN KEY ("pago_id", "gym_slug", "plan") REFERENCES "pagos_intentos"("id", "gym_slug", "plan")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "suscripciones_sede_periodos" ADD CONSTRAINT "suscripciones_sede_periodos_gym_slug_fkey"
    FOREIGN KEY ("gym_slug") REFERENCES "suscripciones_sede"("gym_slug") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pagos_transacciones_revision" ADD CONSTRAINT "pagos_transacciones_revision_pago_id_fkey"
    FOREIGN KEY ("pago_id") REFERENCES "pagos_intentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
