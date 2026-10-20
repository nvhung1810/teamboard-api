import type { CreateTaskInput } from '../../../domain/entities/task.entity';
import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { BoardRepository } from '../../../domain/repositories/board.repository';
import type { TaskRepository } from '../../../domain/repositories/task.repository';

export class CreateTaskUseCase {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly boards: BoardRepository,
  ) {}

  async execute(input: CreateTaskInput) {
    if (!(await this.boards.exists(input.boardId))) {
      throw new NotFoundError(`Không tìm thấy board có id = ${input.boardId}`);
    }
    return this.tasks.create(input);
  }
}
