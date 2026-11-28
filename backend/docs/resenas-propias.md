# Reseñas propias

Las rutas `GET /api/resenas/mias`, `PATCH /api/resenas/mias/:id` y `DELETE /api/resenas/mias/:id` requieren una sesión autenticada. La consulta devuelve todas las reseñas de la cuenta, incluidas las de sedes anteriores. La edición acepta `calificacion` y `comentario`. Las escrituras filtran por identificador y autor en la misma operación. Una reseña inexistente o ajena devuelve `404`.

La eliminación confirmada por el autor elimina esa fila. El esquema actual no tiene relaciones entrantes a `resenas`. Los listados y reportes consultan las filas vigentes, por lo que las nuevas consultas reflejan los cambios. Los archivos previamente descargados representan el estado al momento de su exportación.

## Una reseña vigente por usuario y sede

El POST toma un bloqueo transaccional de PostgreSQL por par de usuario y sede antes de consultar y crear. Si el par ya tiene alguna reseña, devuelve `409`. Los duplicados históricos permanecen visibles y cada fila puede gestionarse individualmente. Se puede publicar otra reseña cuando ya no queda ninguna para el par.

El bloqueo coordina las instancias que usan el POST actualizado. Antes de activar la política, retirar las versiones anteriores que escriban en la tabla y verificar que otros escritores adopten la misma política. Las escrituras directas fuera de ese flujo no tienen una restricción de unicidad.

Antes de proponer una migración, ejecutar en un entorno autorizado una consulta de solo lectura que devuelva únicamente recuentos agregados.

```sql
SELECT count(*) AS pares_duplicados, coalesce(sum(cantidad - 1), 0) AS filas_excedentes
FROM (
  SELECT count(*) AS cantidad
  FROM resenas
  GROUP BY usuario_id, gym_slug
  HAVING count(*) > 1
) AS duplicados;
```

Si hay duplicados, mantener la política en la aplicación hasta acordar cómo conservar y representar las filas anteriores. Una opción es distinguir registros históricos de vigentes y usar un índice único parcial para los vigentes. Antes de aplicar una restricción, ensayar el procedimiento y su reversión en una copia autorizada, comprobar otra vez los duplicados y coordinar los escritores durante el cambio.
