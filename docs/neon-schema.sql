-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "usuarios" (
    "idusuario" UUID NOT NULL,
    "nombres" VARCHAR NOT NULL,
    "apellidos" VARCHAR NOT NULL,
    "correo" VARCHAR NOT NULL,
    "password_hash" VARCHAR,
    "tipo_usuario" VARCHAR NOT NULL DEFAULT 'cliente',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "provider" VARCHAR NOT NULL DEFAULT 'email',
    "provider_id" VARCHAR,
    "tiempo_registrado" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tiempo_duracion_inscripcion" VARCHAR NOT NULL DEFAULT '30 days',
    "bloqueado_hasta" TIMESTAMPTZ(6),
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("idusuario")
);

-- CreateTable
CREATE TABLE "ejercicios" (
    "id" BIGSERIAL NOT NULL,
    "grupo_slug" TEXT NOT NULL,
    "grupo_nombre" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "equipo" TEXT,
    "musculo_principal" TEXT,
    "descripcion" TEXT,
    "consejo" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imagen_url" TEXT,
    "video_url" TEXT,

    CONSTRAINT "ejercicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrenamientos" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrenamientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rutinas" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "dia_etiqueta" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rutinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rutina_ejercicios" (
    "id" BIGSERIAL NOT NULL,
    "rutina_id" UUID NOT NULL,
    "ejercicio_id" BIGINT NOT NULL,
    "orden" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rutina_ejercicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_entrenamiento" (
    "id" UUID NOT NULL,
    "entrenamiento_id" UUID NOT NULL,
    "ejercicio_id" BIGINT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "numero_serie" INTEGER NOT NULL,
    "repeticiones" INTEGER NOT NULL,
    "peso_kg" DECIMAL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_entrenamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "code_hash" VARCHAR NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resenas" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "gym_slug" VARCHAR NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resenas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricas_diarias" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "peso_actual_kg" DOUBLE PRECISION,
    "vasos_agua" INTEGER NOT NULL DEFAULT 0,
    "entrenamiento_completado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "metricas_diarias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "ejercicios_grupo_slug_slug_key" ON "ejercicios"("grupo_slug", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "rutina_ejercicios_rutina_id_orden_key" ON "rutina_ejercicios"("rutina_id", "orden");

-- CreateIndex
CREATE INDEX "verification_codes_usuario_id_idx" ON "verification_codes"("usuario_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_usuario_id_idx" ON "password_reset_tokens"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuario_id_idx" ON "refresh_tokens"("usuario_id");

-- CreateIndex
CREATE INDEX "resenas_usuario_id_idx" ON "resenas"("usuario_id");

-- CreateIndex
CREATE INDEX "resenas_gym_slug_creado_en_idx" ON "resenas"("gym_slug", "creado_en");

-- AddForeignKey
ALTER TABLE "entrenamientos" ADD CONSTRAINT "entrenamientos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutinas" ADD CONSTRAINT "rutinas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina_ejercicios" ADD CONSTRAINT "rutina_ejercicios_ejercicio_id_fkey" FOREIGN KEY ("ejercicio_id") REFERENCES "ejercicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutina_ejercicios" ADD CONSTRAINT "rutina_ejercicios_rutina_id_fkey" FOREIGN KEY ("rutina_id") REFERENCES "rutinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_entrenamiento" ADD CONSTRAINT "series_entrenamiento_ejercicio_id_fkey" FOREIGN KEY ("ejercicio_id") REFERENCES "ejercicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_entrenamiento" ADD CONSTRAINT "series_entrenamiento_entrenamiento_id_fkey" FOREIGN KEY ("entrenamiento_id") REFERENCES "entrenamientos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_entrenamiento" ADD CONSTRAINT "series_entrenamiento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metricas_diarias" ADD CONSTRAINT "metricas_diarias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idusuario") ON DELETE CASCADE ON UPDATE CASCADE;

