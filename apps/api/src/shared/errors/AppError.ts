export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 'BAD_REQUEST', 400, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 'FORBIDDEN', 403);
  }

  static notFound(resource: string) {
    return new AppError(`${resource} not found`, 'NOT_FOUND', 404);
  }

  static conflict(message: string) {
    return new AppError(message, 'CONFLICT', 409);
  }

  static unprocessable(message: string, details?: unknown) {
    return new AppError(message, 'UNPROCESSABLE_ENTITY', 422, details);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new AppError(message, 'TOO_MANY_REQUESTS', 429);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 'INTERNAL_ERROR', 500);
  }
}
