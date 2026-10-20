import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { createBoardRoutes } from './routes/board.routes';
import { createTaskRoutes } from './routes/task.routes';
import type { BoardController } from './controllers/board.controller';
import type { TaskController } from './controllers/task.controller';
import { swaggerSpec } from './docs/swagger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export interface AppDependencies {
  boardController: BoardController;
  taskController: TaskController;
}

export function createApp({ boardController, taskController }: AppDependencies) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.redirect('/api-docs');
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });

  app.use('/api/boards', createBoardRoutes(boardController));
  app.use('/api/tasks', createTaskRoutes(taskController));

  // Hai middleware này phải đặt cuối cùng
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
