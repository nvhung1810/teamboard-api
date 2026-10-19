import type { Request, Response } from 'express';
import { taskService } from '../services/task.service';
import { idParamSchema } from '../validators/common.validator';
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from '../validators/task.validator';

export const taskController = {
  async getAll(req: Request, res: Response) {
    const query = taskQuerySchema.parse(req.query);
    const items = await taskService.findAll(query);
    res.json(items);
  },

  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const item = await taskService.findById(id);
    res.json(item);
  },

  async create(req: Request, res: Response) {
    const data = createTaskSchema.parse(req.body);
    const item = await taskService.create(data);
    res.status(201).json(item);
  },

  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const data = updateTaskSchema.parse(req.body);
    const item = await taskService.update(id, data);
    res.json(item);
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await taskService.remove(id);
    res.status(204).send();
  },
};
