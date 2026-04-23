class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message) {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'Não autenticado') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Acesso negado') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Recurso não encontrado') {
    return new AppError(message, 404);
  }

  static conflict(message) {
    return new AppError(message, 409);
  }
}

module.exports = AppError;
