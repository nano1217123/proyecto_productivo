-- Módulo de pagos (Wompi): importe calculado desde el precio en USD.
-- Compatible con los intentos existentes: las columnas nuevas admiten NULL
-- (intentos creados con importes fijos en COP) y monto_en_centavos no se
-- modifica en ninguna fila.

-- AlterTable
ALTER TABLE "pagos_intentos"
    ADD COLUMN "periodo" VARCHAR(20) NOT NULL DEFAULT 'mensual',
    ADD COLUMN "precio_usd_centavos" INTEGER,
    ADD COLUMN "tasa_usd_cop" DECIMAL(12,4);

-- Precio y tasa van juntos: ambos presentes y positivos, o ambos ausentes.
ALTER TABLE "pagos_intentos"
    ADD CONSTRAINT "pagos_intentos_conversion_valida" CHECK (
        ("precio_usd_centavos" IS NULL AND "tasa_usd_cop" IS NULL)
        OR ("precio_usd_centavos" > 0 AND "tasa_usd_cop" > 0)
    );

-- Por ahora solo existe el plan mensual.
ALTER TABLE "pagos_intentos"
    ADD CONSTRAINT "pagos_intentos_periodo_valido" CHECK ("periodo" IN ('mensual'));
