import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { BoardRepository } from '../../../domain/repositories/board.repository';

export class DeleteBoardUseCase {
  constructor(private readonly boards: BoardRepository) {}

  async execute(id: number) {
    if (!(await this.boards.exists(id))) {
      throw new NotFoundError(`Không tìm thấy board có id = ${id}`);
    }
    await this.boards.delete(id);
  }
}
