import { Router } from 'express';
import type { BoardController } from '../controllers/board.controller';

export function createBoardRoutes(controller: BoardController) {
  const router = Router();

  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
