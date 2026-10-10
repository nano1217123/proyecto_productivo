/**
 * Script de migración: ejercicios de Supabase (CSV) → Neon (Prisma).
 *
 * Uso:
 *   npx tsx scripts/migrate-ejercicios.ts
 *
 * Características:
 *   - Lee backend/scripts/data/ejercicios.csv
 *   - Inserta en la tabla `ejercicios` de Neon con Prisma
 *   - Es idempotente: si un id ya existe, lo actualiza en vez de duplicar
 *   - Reporta al final: insertados, actualizados, fallidos
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "../src/generated/prisma/client.js";
import "dotenv/config";    
import { PrismaNeon } from "@prisma/adapter-neon";   



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_PATH = resolve(__dirname, "data", "ejercicios.csv");

interface CsvRow {
  id: string;
  grupo_slug: string;
  grupo_nombre: string;
  nombre: string;
  slug: string;
  equipo: string | null;
  musculo_principal: string | null;
  descripcion: string | null;
  consejo: string | null;
  creado_en: string;
}

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  console.log("📖 Leyendo CSV...");
  const csvContent = readFileSync(CSV_PATH, "utf-8");

  const rows: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  console.log(`   → ${rows.length} filas leídas.`);

  let insertados = 0;
  let actualizados = 0;
  let fallidos = 0;

  console.log("💾 Insertando en Neon...");

  for (const row of rows) {
    const id = BigInt(row.id);
    const data = {
      grupoSlug: row.grupo_slug,
      grupoNombre: row.grupo_nombre,
      nombre: row.nombre,
      slug: row.slug,
      equipo: row.equipo || null,
      musculoPrincipal: row.musculo_principal || null,
      descripcion: row.descripcion || null,
      consejo: row.consejo || null,
      creadoEn: new Date(row.creado_en),
    };

    try {
      const existente = await prisma.ejercicio.findUnique({ where: { id } });

      if (existente) {
        await prisma.ejercicio.update({ where: { id }, data });
        actualizados++;
      } else {
        await prisma.ejercicio.create({ data: { id, ...data } });
        insertados++;
      }
    } catch (err) {
      console.error(`   ❌ Error en id=${row.id}:`, (err as Error).message);
      fallidos++;
    }
  }

  const total = await prisma.ejercicio.count();

  console.log("");
  console.log("═══════════════════════════════════════");
  console.log("✅ Migración completada");
  console.log(`   Insertados:   ${insertados}`);
  console.log(`   Actualizados: ${actualizados}`);
  console.log(`   Fallidos:     ${fallidos}`);
  console.log(`   Total en BD:  ${total}`);
  console.log("═══════════════════════════════════════");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("💥 Error fatal:", err);
  process.exit(1);
});