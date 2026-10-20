import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../../domain/errors/not-found.error';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Validation error from Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Invalid data',
      errors: err.issues.map((issue) => ({
        field: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // Resource not found (thrown from a use case)
  if (err instanceof NotFoundError) {
    res.status(404).json({ message: err.message });
    return;
  }

  // Known Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Record not found' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({ message: 'Invalid foreign key' });
      return;
    }
  }

  // Request body is not valid JSON
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ message: 'Request body is not valid JSON' });
    return;
  }

  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
};
