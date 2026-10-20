import { z } from 'zod';

export const createBoardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Board name must not be empty')
    .max(100, 'Board name must be at most 100 characters'),
  description: z.string().max(1000).nullable().optional(),
});

export const updateBoardSchema = createBoardSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  });

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
