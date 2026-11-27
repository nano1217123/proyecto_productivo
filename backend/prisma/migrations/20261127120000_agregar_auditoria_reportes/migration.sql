BEGIN;

CREATE TABLE "public"."auditoria_reportes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitud_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "tipo_reporte" VARCHAR(20) NOT NULL,
    "formato" VARCHAR(3) NOT NULL,
    "alcance" VARCHAR(12),
    "sede_slug" VARCHAR(64),
    "ocurrido_en" TIMESTAMPTZ(6) NOT NULL,
    "evento" VARCHAR(24) NOT NULL,
    "resultado" VARCHAR(32) NOT NULL,
    CONSTRAINT "auditoria_reportes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auditoria_reportes_tipo_check"
      CHECK ("tipo_reporte" IN ('resenas', 'progreso', 'rutinas', 'ejercicios', 'membresias')),
    CONSTRAINT "auditoria_reportes_formato_check" CHECK ("formato" IN ('csv', 'pdf')),
    CONSTRAINT "auditoria_reportes_alcance_check" CHECK (
      ("sede_slug" IS NULL AND ("alcance" IS NULL OR "alcance" IN ('personal', 'consolidado')))
      OR ("alcance" IS NOT NULL AND "alcance" = 'sede' AND "sede_slug" IS NOT NULL)
    ),
    CONSTRAINT "auditoria_reportes_evento_resultado_check" CHECK (
      ("evento" = 'archivo_generado' AND "resultado" = 'ok' AND "alcance" IS NOT NULL)
      OR ("evento" = 'respuesta_finalizada' AND "resultado" IN ('ok', 'sin_cuerpo'))
      OR ("evento" = 'respuesta_interrumpida' AND "resultado" = 'conexion_cerrada')
      OR ("evento" = 'solicitud_rechazada' AND "resultado" IN
        ('invalidacion', 'sin_permiso', 'no_encontrado', 'no_procesable', 'cuota', 'otro_rechazo'))
      OR ("evento" = 'error_generacion' AND "resultado" IN ('error_interno', 'auditoria_no_disponible'))
    )
);

CREATE UNIQUE INDEX "auditoria_reportes_solicitud_id_evento_key"
  ON "public"."auditoria_reportes"("solicitud_id", "evento");
CREATE INDEX "auditoria_reportes_actor_id_ocurrido_en_idx"
  ON "public"."auditoria_reportes"("actor_id", "ocurrido_en");
CREATE INDEX "auditoria_reportes_ocurrido_en_idx"
  ON "public"."auditoria_reportes"("ocurrido_en");

CREATE FUNCTION "public"."impedir_mutacion_auditoria_reportes"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'La auditoría de reportes solo admite inserciones';
END;
$$;

CREATE TRIGGER "auditoria_reportes_solo_insercion"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "public"."auditoria_reportes"
FOR EACH STATEMENT EXECUTE FUNCTION "public"."impedir_mutacion_auditoria_reportes"();

COMMIT;
