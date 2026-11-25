-- Módulo de pagos (Wompi) · paso 3: webhook de eventos.
-- Guarda la transacción de Wompi asociada al intento y la marca de tiempo
-- del último evento aplicado, para descartar eventos antiguos.
-- Compatible con los intentos existentes: las columnas nuevas admiten NULL.

-- AlterTable
ALTER TABLE "pagos_intentos"
    ADD COLUMN "wompi_transaccion_id" VARCHAR(64),
    ADD COLUMN "wompi_evento_en" TIMESTAMPTZ(6);

-- Una transacción de Wompi pertenece a un único intento.
-- CreateIndex
CREATE UNIQUE INDEX "pagos_intentos_wompi_transaccion_id_key" ON "pagos_intentos"("wompi_transaccion_id");

-- Estados admitidos (equivalen a PENDING, APPROVED, DECLINED, VOIDED y ERROR).
ALTER TABLE "pagos_intentos"
    ADD CONSTRAINT "pagos_intentos_estado_valido" CHECK (
        "estado" IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'ANULADO', 'ERROR')
    );
