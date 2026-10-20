import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { BoardRepository } from '../../../domain/repositories/board.repository';

export class GetBoardUseCase {
  constructor(private readonly boards: BoardRepository) {}

  async execute(id: number) {
    const board = await this.boards.findById(id);
    if (!board) throw new NotFoundError(`Board not found with id = ${id}`);
    return board;
  }
}
