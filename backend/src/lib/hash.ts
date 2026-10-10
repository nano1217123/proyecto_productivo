import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// Genera el hash de una contraseña en texto plano.
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// Compara una contraseña en texto plano contra un hash.
// Devuelve true si coinciden.
export async function comparePassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}