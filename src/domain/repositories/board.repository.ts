import type {
  Board,
  BoardWithTaskCount,
  BoardWithTasks,
  CreateBoardInput,
  UpdateBoardInput,
} from '../entities/board.entity';

export interface BoardRepository {
  findAll(): Promise<BoardWithTaskCount[]>;
  findById(id: number): Promise<BoardWithTasks | null>;
  exists(id: number): Promise<boolean>;
  create(data: CreateBoardInput): Promise<Board>;
  update(id: number, data: UpdateBoardInput): Promise<Board>;
  delete(id: number): Promise<void>;
}
