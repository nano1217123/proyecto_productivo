# Expansión de métricas diarias

**Preparación técnica para revisión y ensayos locales con datos ficticios. Los scripts de esta carpeta no están autorizados para ejecutarse en producción, Neon ni otras bases compartidas.** Cualquier procedimiento para un entorno compartido requiere revisión y autorización separadas.

La migración `20261125120000_metricas_dia_local_nullable` añade una columna nullable sin valor predeterminado. Las filas históricas conservan sus valores y el modo anterior puede seguir insertando. Aplicar la expansión antes de desplegar el cliente Prisma regenerado. Mantener `PARTICULAR_METRICAS_DIARIAS` desactivado durante esta etapa.

## Diagnóstico y archivo

- Ejecutar `diagnostico.sql` después de la expansión con una cuenta autorizada de lectura. Usa una sola instantánea para contar días sin rellenar o inconsistentes y agrupar los registros por usuario y fecha de Bogotá. Los indicadores de discrepancia comparan los valores almacenados, incluido el peso nulo. `0` y `false` son valores explícitos para la revisión.
- La suite autoriza `archivar-duplicados.sql` en la base desechable mediante los parámetros de `psql` `modo=ensayo-local`, `destino`, `autorizacion` y `lote`. También aprovisiona una marca aleatoria fuera del script. El script exige una conexión por socket Unix, el usuario sintético y la coincidencia del nombre, OID de base, identificador de clúster y marca. Los parámetros por sí solos no habilitan un destino. Ante una discrepancia o una marca ausente, aborta antes de crear el archivo.
- El archivo contiene la fila original completa de cada integrante del grupo, incluido cualquier candidato a canónico. La tabla de lotes reserva cada identificador en la misma transacción que la copia, incluso si el conjunto está vacío. Reusar un identificador aborta la transacción. Una fila puede aparecer bajo otro lote **solo para una nueva instantánea expresamente autorizada**, con identificador distinto y motivo documentado. Un reintento del mismo trabajo debe revisar el lote existente.
- Conciliar los IDs del diagnóstico con el archivo del mismo lote y comprobar el contenido original antes de autorizar cualquier consolidación. Conservar los IDs y documentar el mapa de original a canónico. Para valores idénticos, usar el desempate estable por `fecha, id`, previa comprobación de referencias. Someter las discrepancias a aprobación; el script deja intactos todos los grupos.
- Mantener el esquema de archivo restringido a los responsables de la migración. Revisar los permisos efectivos, incluidos permisos heredados y privilegios por defecto, y acordar retención antes de copiar datos reales. Guardar un respaldo recuperable y ensayar la restauración en una copia aislada.

## Condiciones para el corte definitivo

1. Conciliar el esquema y el historial aplicado del entorno destino con el equipo.
2. Confirmar que los escritores anteriores, incluidas las instancias desplegadas anteriormente, estén pausados o retirados. Durante la expansión pueden seguir apareciendo filas sin día.
3. Completar el backfill con `(fecha AT TIME ZONE 'America/Bogota')::date`, aprobar los grupos ambiguos y verificar que el archivo permita recuperar las filas originales.
4. Verificar cero días nulos, cero días inconsistentes y cero duplicados. Solo entonces preparar el cambio separado que imponga `NOT NULL` y la unicidad de `(usuario_id, dia_local)`.
5. Preparar la activación coordinada y una reversión que mantenga un escritor compatible con la columna obligatoria o deje las escrituras pausadas. Volver al escritor anterior por sí solo deja de ser viable después de exigir `NOT NULL`.

## Ensayo local

`tests/particular.expansion.integration.ts` espera el ID de un contenedor desechable en `JJGYM_EXPANSION_CONTAINER`. El contenedor debe tener la etiqueta `jjgym.expansion` igual a su nombre con prefijo `jjgym-metricas-expansion-`, PostgreSQL expuesto solo en loopback y el usuario sintético `metricas_test` con la contraseña de prueba `solo-pruebas-locales`. La suite crea una base exclusiva dentro de ese contenedor. Desde `backend`, ejecutar:

```text
node --experimental-test-module-mocks --import tsx --test tests/particular.expansion.integration.ts
```

Generar el cliente Prisma antes del ensayo y retirar el contenedor temporal al terminar. La suite recorre el SQL histórico y usa el cliente regenerado contra PostgreSQL mediante un transporte TCP local de prueba.
