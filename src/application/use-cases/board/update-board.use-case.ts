import type { UpdateBoardInput } from '../../../domain/entities/board.entity';
import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { BoardRepository } from '../../../domain/repositories/board.repository';

export class UpdateBoardUseCase {
  constructor(private readonly boards: BoardRepository) {}

  async execute(id: number, input: UpdateBoardInput) {
    if (!(await this.boards.exists(id))) {
      throw new NotFoundError(`Không tìm thấy board có id = ${id}`);
    }
    return this.boards.update(id, input);
  }
}
