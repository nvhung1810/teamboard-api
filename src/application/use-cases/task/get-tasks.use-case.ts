import type { TaskFilter } from '../../../domain/entities/task.entity';
import type { TaskRepository } from '../../../domain/repositories/task.repository';

export class GetTasksUseCase {
  constructor(private readonly tasks: TaskRepository) {}

  execute(filter: TaskFilter) {
    return this.tasks.findAll(filter);
  }
}
