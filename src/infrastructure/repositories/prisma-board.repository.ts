import type { PrismaClient } from '@prisma/client';
import type {
  Board,
  BoardWithTaskCount,
  BoardWithTasks,
  CreateBoardInput,
  UpdateBoardInput,
} from '../../domain/entities/board.entity';
import type { BoardRepository } from '../../domain/repositories/board.repository';

export class PrismaBoardRepository implements BoardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<BoardWithTaskCount[]> {
    const rows = await this.prisma.board.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tasks: true } } },
    });
    return rows.map(({ _count, ...board }) => ({ ...board, taskCount: _count.tasks }));
  }

  findById(id: number): Promise<BoardWithTasks | null> {
    return this.prisma.board.findUnique({
      where: { id },
      include: { tasks: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async exists(id: number): Promise<boolean> {
    const board = await this.prisma.board.findUnique({ where: { id }, select: { id: true } });
    return board !== null;
  }

  create(data: CreateBoardInput): Promise<Board> {
    return this.prisma.board.create({ data });
  }

  update(id: number, data: UpdateBoardInput): Promise<Board> {
    return this.prisma.board.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.board.delete({ where: { id } });
  }
}
