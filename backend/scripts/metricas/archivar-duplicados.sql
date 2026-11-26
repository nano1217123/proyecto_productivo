-- Preparación técnica. Ejecutable solo en un ensayo local desechable autorizado.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL search_path = pg_catalog, pg_temp;

-- La suite aprovisiona esta marca fuera del script, dentro del contenedor verificado.
-- Una base clonada conserva la marca, pero cambia su OID o la identidad del clúster.
SELECT (
    :'modo' = 'ensayo-local'
    AND current_database() = :'destino'
    AND current_database() ~ '^metricas_expansion_[0-9a-f]{32}$'
    AND session_user = 'metricas_test'
    AND current_user = session_user
    AND inet_server_addr() IS NULL
    AND EXISTS (
        SELECT 1
        FROM jjgym_ensayo.destino AS marca
        JOIN pg_database AS db ON db.datname = current_database()
        CROSS JOIN pg_control_system() AS control
        WHERE marca.base_oid = db.oid
          AND marca.sistema = control.system_identifier
          AND marca.autorizacion::text = :'autorizacion'
    )
) AS jjgym_destino_autorizado
\gset
\if :jjgym_destino_autorizado
\else
DO $$ BEGIN RAISE EXCEPTION 'Destino no autorizado para el archivado de ensayo'; END $$;
\endif

CREATE SCHEMA IF NOT EXISTS metricas_migracion;
REVOKE ALL ON SCHEMA metricas_migracion FROM PUBLIC;

CREATE TABLE IF NOT EXISTS metricas_migracion.lotes (
    lote TEXT PRIMARY KEY CHECK (btrim(lote) <> ''),
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
REVOKE ALL ON TABLE metricas_migracion.lotes FROM PUBLIC;

CREATE TABLE IF NOT EXISTS metricas_migracion.originales (
    lote TEXT NOT NULL REFERENCES metricas_migracion.lotes (lote),
    original_id UUID NOT NULL,
    dia_bogota DATE NOT NULL,
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fila_original JSONB NOT NULL,
    PRIMARY KEY (lote, original_id)
);
REVOKE ALL ON TABLE metricas_migracion.originales FROM PUBLIC;

INSERT INTO metricas_migracion.lotes (lote) VALUES (:'lote');

WITH filas AS (
    SELECT m AS original, m.id, (m.fecha AT TIME ZONE 'America/Bogota')::date AS dia_bogota,
           count(*) OVER (
             PARTITION BY m.usuario_id, (m.fecha AT TIME ZONE 'America/Bogota')::date
           ) AS total
    FROM public.metricas_diarias m
)
INSERT INTO metricas_migracion.originales (lote, original_id, dia_bogota, fila_original)
SELECT :'lote', id, dia_bogota, to_jsonb(original)
FROM filas
WHERE total > 1;

COMMIT;
