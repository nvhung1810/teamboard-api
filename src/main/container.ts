import { prisma } from '../infrastructure/database/prisma';
import { PrismaBoardRepository } from '../infrastructure/repositories/prisma-board.repository';
import { PrismaTaskRepository } from '../infrastructure/repositories/prisma-task.repository';
import { CreateBoardUseCase } from '../application/use-cases/board/create-board.use-case';
import { DeleteBoardUseCase } from '../application/use-cases/board/delete-board.use-case';
import { GetBoardUseCase } from '../application/use-cases/board/get-board.use-case';
import { GetBoardsUseCase } from '../application/use-cases/board/get-boards.use-case';
import { UpdateBoardUseCase } from '../application/use-cases/board/update-board.use-case';
import { CreateTaskUseCase } from '../application/use-cases/task/create-task.use-case';
import { DeleteTaskUseCase } from '../application/use-cases/task/delete-task.use-case';
import { GetTaskUseCase } from '../application/use-cases/task/get-task.use-case';
import { GetTasksUseCase } from '../application/use-cases/task/get-tasks.use-case';
import { UpdateTaskUseCase } from '../application/use-cases/task/update-task.use-case';
import { BoardController } from '../presentation/http/controllers/board.controller';
import { TaskController } from '../presentation/http/controllers/task.controller';

// Composition root: the only place that knows the concrete implementations of the interfaces
const boardRepository = new PrismaBoardRepository(prisma);
const taskRepository = new PrismaTaskRepository(prisma);

export const boardController = new BoardController(
  new GetBoardsUseCase(boardRepository),
  new GetBoardUseCase(boardRepository),
  new CreateBoardUseCase(boardRepository),
  new UpdateBoardUseCase(boardRepository),
  new DeleteBoardUseCase(boardRepository),
);

export const taskController = new TaskController(
  new GetTasksUseCase(taskRepository),
  new GetTaskUseCase(taskRepository),
  new CreateTaskUseCase(taskRepository, boardRepository),
  new UpdateTaskUseCase(taskRepository, boardRepository),
  new DeleteTaskUseCase(taskRepository),
);
