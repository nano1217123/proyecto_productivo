-- Migracion intencionalmente vacia (no-op).
--
-- El cambio a @default(uuid(7)) en schema.prisma lo genera Prisma Client
-- en Node al crear cada registro; NO requiere ningun cambio en la base de datos.
--
-- La version original de este archivo ponia DEFAULT gen_random_uuid() (UUID v4)
-- y fallaba en una base nueva porque "metricas_diarias" aun no existia en este punto.
-- En Neon esta migracion quedo registrada con `migrate resolve --applied`
-- sin ejecutarse, por lo que vaciarla no cambia nada alli.
SELECT 1;
