import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import boardRoutes from './routes/board.routes';
import taskRoutes from './routes/task.routes';
import { swaggerSpec } from './docs/swagger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

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

app.use('/api/boards', boardRoutes);
app.use('/api/tasks', taskRoutes);

// Hai middleware này phải đặt cuối cùng
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
