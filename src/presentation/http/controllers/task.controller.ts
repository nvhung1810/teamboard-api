import type { Request, Response } from 'express';
import type { CreateTaskUseCase } from '../../../application/use-cases/task/create-task.use-case';
import type { DeleteTaskUseCase } from '../../../application/use-cases/task/delete-task.use-case';
import type { GetTaskUseCase } from '../../../application/use-cases/task/get-task.use-case';
import type { GetTasksUseCase } from '../../../application/use-cases/task/get-tasks.use-case';
import type { UpdateTaskUseCase } from '../../../application/use-cases/task/update-task.use-case';
import { idParamSchema } from '../validators/common.validator';
import { createTaskSchema, taskQuerySchema, updateTaskSchema } from '../validators/task.validator';

export class TaskController {
  constructor(
    private readonly getTasks: GetTasksUseCase,
    private readonly getTask: GetTaskUseCase,
    private readonly createTask: CreateTaskUseCase,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly deleteTask: DeleteTaskUseCase,
  ) {}

  getAll = async (req: Request, res: Response) => {
    const filter = taskQuerySchema.parse(req.query);
    res.json(await this.getTasks.execute(filter));
  };

  getById = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await this.getTask.execute(id));
  };

  create = async (req: Request, res: Response) => {
    const data = createTaskSchema.parse(req.body);
    res.status(201).json(await this.createTask.execute(data));
  };

  update = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const data = updateTaskSchema.parse(req.body);
    res.json(await this.updateTask.execute(id, data));
  };

  remove = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    await this.deleteTask.execute(id);
    res.status(204).send();
  };
}
