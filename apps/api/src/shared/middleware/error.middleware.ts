import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { logger } from '../logger/logger';
import { env } from '../../config/env';

// Schema validation / bad ID casts are client errors, not server faults
function fromMongoose(err: Error): Error {
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return AppError.badRequest('Validation failed', details);
  }
  if (err instanceof mongoose.Error.CastError) {
    return AppError.badRequest(`Invalid value for ${err.path}`);
  }
  return err;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  err = fromMongoose(err);
  if (err instanceof AppError && err.isOperational) {
    logger.warn(`[${err.code}] ${err.message}`, {
      path: req.path,
      method: req.method,
      details: err.details,
    });

    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  };

  res.status(500).json(response);
}
