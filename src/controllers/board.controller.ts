import type { Request, Response } from 'express';
import { boardService } from '../services/board.service';
import { idParamSchema } from '../validators/common.validator';
import { createBoardSchema, updateBoardSchema } from '../validators/board.validator';

export const boardController = {
  async getAll(_req: Request, res: Response) {
    const items = await boardService.findAll();
    res.json(items);
  },

  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const item = await boardService.findById(id);
    res.json(item);
  },

  async create(req: Request, res: Response) {
    const data = createBoardSchema.parse(req.body);
    const item = await boardService.create(data);
    res.status(201).json(item);
  },

  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const data = updateBoardSchema.parse(req.body);
    const item = await boardService.update(id, data);
    res.json(item);
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await boardService.remove(id);
    res.status(204).send();
  },
};
