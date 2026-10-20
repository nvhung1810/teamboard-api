import { z } from 'zod';

export const createBoardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên board không được để trống')
    .max(100, 'Tên board tối đa 100 ký tự'),
  description: z.string().max(1000).nullable().optional(),
});

export const updateBoardSchema = createBoardSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Cần gửi ít nhất một trường để cập nhật',
  });

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
