import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";
import { env } from "../config/env.js";

// Cliente Prisma centralizado.
// Usa el adapter de Neon con la URL pooled (DATABASE_URL).
// Solo los repositorios deben importar este cliente.
const adapter = new PrismaNeon({ connectionString: env.databaseUrl });

export const prisma = new PrismaClient({ adapter });