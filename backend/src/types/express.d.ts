import type { TipoUsuario } from "./usuario.types.js";

// Añade a Request de Express los datos que dejan los middleware de
// autenticación, para poder usarlos con tipado correcto.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: TipoUsuario;
    }
  }
}

export {};