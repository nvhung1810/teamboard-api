import type { PrismaClient } from '@prisma/client';
import type {
  CreateTaskInput,
  Task,
  TaskFilter,
  TaskWithBoard,
  UpdateTaskInput,
} from '../../domain/entities/task.entity';
import type { TaskRepository } from '../../domain/repositories/task.repository';

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(filter: TaskFilter): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { boardId: filter.boardId, status: filter.status, priority: filter.priority },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: number): Promise<TaskWithBoard | null> {
    return this.prisma.task.findUnique({
      where: { id },
      include: { board: { select: { id: true, name: true } } },
    });
  }

  async exists(id: number): Promise<boolean> {
    const task = await this.prisma.task.findUnique({ where: { id }, select: { id: true } });
    return task !== null;
  }

  create(data: CreateTaskInput): Promise<Task> {
    return this.prisma.task.create({ data });
  }

  update(id: number, data: UpdateTaskInput): Promise<Task> {
    return this.prisma.task.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }
}
