import type { CreateBoardInput } from '../../../domain/entities/board.entity';
import type { BoardRepository } from '../../../domain/repositories/board.repository';

export class CreateBoardUseCase {
  constructor(private readonly boards: BoardRepository) {}

  execute(input: CreateBoardInput) {
    return this.boards.create(input);
  }
}
