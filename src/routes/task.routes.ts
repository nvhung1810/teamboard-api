import { Router } from 'express';
import { taskController } from '../controllers/task.controller';

const router = Router();

router.get('/', taskController.getAll);
router.get('/:id', taskController.getById);
router.post('/', taskController.create);
router.put('/:id', taskController.update);
router.delete('/:id', taskController.remove);

export default router;
