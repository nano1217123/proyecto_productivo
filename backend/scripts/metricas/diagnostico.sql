BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;

SELECT count(*) FILTER (WHERE dia_local IS NULL) AS filas_sin_dia_local,
       count(*) FILTER (
         WHERE dia_local <> (fecha AT TIME ZONE 'America/Bogota')::date
       ) AS dias_inconsistentes
FROM metricas_diarias;

WITH historico AS (
  SELECT *, (fecha AT TIME ZONE 'America/Bogota')::date AS dia_bogota
  FROM metricas_diarias
)
SELECT usuario_id, dia_bogota, count(*) AS filas,
       array_agg(id ORDER BY fecha, id) AS ids_originales,
       count(DISTINCT jsonb_build_array(peso_actual_kg)) > 1 AS peso_discrepa,
       count(DISTINCT vasos_agua) > 1 AS agua_discrepa,
       count(DISTINCT entrenamiento_completado) > 1 AS entrenamiento_discrepa
FROM historico
GROUP BY usuario_id, dia_bogota
HAVING count(*) > 1
ORDER BY usuario_id, dia_bogota;

COMMIT;
