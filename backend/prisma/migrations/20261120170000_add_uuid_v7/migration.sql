-- AlterTable
ALTER TABLE "verification_codes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "password_reset_tokens" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "resenas" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "metricas_diarias" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();