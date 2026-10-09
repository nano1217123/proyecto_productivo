// Error "esperado" de la aplicación: lleva el código HTTP que debe
// recibir el cliente y un mensaje seguro para mostrarle.
// Los servicios lo lanzan; nunca necesitan conocer Express ni `res`.
export class AppError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}