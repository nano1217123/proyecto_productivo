import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../errors/AppError.js";

// Express 4 no captura los errores de funciones async: una promesa
// rechazada quedaría sin manejar. Este envoltorio la redirige a next(err)
// para que llegue al errorHandler.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

// Errores que lanza express.json() (body-parser) traen una propiedad `type`.
function getBodyParserErrorType(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "type" in err) {
    return String((err as { type: unknown }).type);
  }
  return undefined;
}

// Error handler global. SIEMPRE responde JSON con la forma { message }.
// Debe registrarse al final, después de todas las rutas.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  // Si ya se empezó a responder, Express debe cerrar la conexión.
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  const bodyErrorType = getBodyParserErrorType(err);

  if (bodyErrorType === "entity.parse.failed") {
    return res
      .status(400)
      .json({ message: "El cuerpo de la solicitud no es JSON válido." });
  }

  if (bodyErrorType === "entity.too.large") {
    return res
      .status(413)
      .json({ message: "La solicitud es demasiado grande." });
  }

  console.error("Error no manejado:", err);
  return res
    .status(500)
    .json({ message: "Ocurrió un error inesperado en el servidor." });
}