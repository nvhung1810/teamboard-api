import { z } from 'zod';

export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);
export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title must not be empty')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string().max(5000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  boardId: z.number().int().positive('boardId must be a positive integer'),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  });

export const taskQuerySchema = z.object({
  boardId: z.coerce.number().int().positive().optional(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
