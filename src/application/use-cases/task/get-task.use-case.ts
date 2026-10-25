import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { TaskRepository } from '../../../domain/repositories/task.repository';

export class GetTaskUseCase {
  constructor(private readonly tasks: TaskRepository) {}

  async execute(id: number) {
    const task = await this.tasks.findById(id);
    if (!task) throw new NotFoundError(`Task not found with id = ${id}`);
    return task;
  }
}
