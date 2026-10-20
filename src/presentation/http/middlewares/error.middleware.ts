import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../../domain/errors/not-found.error';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Không tồn tại route ${req.method} ${req.originalUrl}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Lỗi validate từ Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Dữ liệu không hợp lệ',
      errors: err.issues.map((issue) => ({
        field: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // Không tìm thấy tài nguyên (ném từ use case)
  if (err instanceof NotFoundError) {
    res.status(404).json({ message: err.message });
    return;
  }

  // Lỗi đã biết từ Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Không tìm thấy bản ghi' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({ message: 'Khoá ngoại không hợp lệ' });
      return;
    }
  }

  // Body gửi lên không phải JSON hợp lệ
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ message: 'Body không phải JSON hợp lệ' });
    return;
  }

  console.error(err);
  res.status(500).json({ message: 'Lỗi máy chủ' });
};
