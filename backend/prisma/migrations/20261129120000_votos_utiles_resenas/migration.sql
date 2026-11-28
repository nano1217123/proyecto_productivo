CREATE TABLE "votos_utiles_resenas" (
    "resena_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votos_utiles_resenas_pkey" PRIMARY KEY ("resena_id", "usuario_id")
);

CREATE INDEX "votos_utiles_resenas_usuario_id_idx" ON "votos_utiles_resenas"("usuario_id");

ALTER TABLE "votos_utiles_resenas" ADD CONSTRAINT "votos_utiles_resenas_resena_id_fkey"
    FOREIGN KEY ("resena_id") REFERENCES "resenas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "votos_utiles_resenas" ADD CONSTRAINT "votos_utiles_resenas_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;
