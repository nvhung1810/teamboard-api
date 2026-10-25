import { Router } from 'express';
import type { TaskController } from '../controllers/task.controller';

export function createTaskRoutes(controller: TaskController) {
  const router = Router();

  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
