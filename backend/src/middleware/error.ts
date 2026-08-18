import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error(`Request failed: ${req.method} ${req.originalUrl}`, { error: err.message });
    } else {
      logger.warn(`Request rejected: ${req.method} ${req.originalUrl}`, { status: err.statusCode, error: err.message });
    }
    res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: { message: 'Validation error', details: err.flatten() },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  logger.error(`Unhandled error: ${req.method} ${req.originalUrl}`, { error: message, stack: err instanceof Error ? err.stack : undefined });
  res.status(500).json({
    success: false,
    error: { message: 'Internal server error' },
  });
}
