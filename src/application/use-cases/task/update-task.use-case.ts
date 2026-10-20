import type { UpdateTaskInput } from '../../../domain/entities/task.entity';
import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { BoardRepository } from '../../../domain/repositories/board.repository';
import type { TaskRepository } from '../../../domain/repositories/task.repository';

export class UpdateTaskUseCase {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly boards: BoardRepository,
  ) {}

  async execute(id: number, input: UpdateTaskInput) {
    if (!(await this.tasks.exists(id))) {
      throw new NotFoundError(`Không tìm thấy task có id = ${id}`);
    }
    if (input.boardId !== undefined && !(await this.boards.exists(input.boardId))) {
      throw new NotFoundError(`Không tìm thấy board có id = ${input.boardId}`);
    }
    return this.tasks.update(id, input);
  }
}
