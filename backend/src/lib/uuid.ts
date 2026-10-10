import { v7 as uuidv7 } from "uuid";

// Genera un UUID versión 7 (ordenable por tiempo).
// Se usa como ID principal en las tablas que no tienen autoincrement.
export function generateId(): string {
  return uuidv7();
}