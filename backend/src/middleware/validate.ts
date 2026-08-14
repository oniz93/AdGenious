import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

function parse(schema: Schema, data: unknown) {
  return schema.safeParse(data);
}

export function validateBody(schema: Schema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = parse(schema, req.body);
    if (!result.success) {
      res.status(422).json({
        success: false,
        error: { message: 'Validation error', details: result.error.flatten() },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: Schema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = parse(schema, req.query);
    if (!result.success) {
      res.status(422).json({
        success: false,
        error: { message: 'Validation error', details: result.error.flatten() },
      });
      return;
    }
    req.query = result.data as Record<string, string>;
    next();
  };
}
