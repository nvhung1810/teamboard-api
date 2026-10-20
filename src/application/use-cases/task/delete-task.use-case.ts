import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { TaskRepository } from '../../../domain/repositories/task.repository';

export class DeleteTaskUseCase {
  constructor(private readonly tasks: TaskRepository) {}

  async execute(id: number) {
    if (!(await this.tasks.exists(id))) {
      throw new NotFoundError(`Không tìm thấy task có id = ${id}`);
    }
    await this.tasks.delete(id);
  }
}
