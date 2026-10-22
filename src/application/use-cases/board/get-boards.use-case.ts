import type { BoardRepository } from '../../../domain/repositories/board.repository';

export class GetBoardsUseCase {
  constructor(private readonly boards: BoardRepository) {}

  execute() {
    return this.boards.findAll();
  }
}
