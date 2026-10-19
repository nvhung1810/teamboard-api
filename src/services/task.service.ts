import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/http-error';
import { boardService } from './board.service';
import type { CreateTaskInput, TaskQuery, UpdateTaskInput } from '../validators/task.validator';

async function ensureTaskExists(id: number) {
  const task = await prisma.task.findUnique({ where: { id }, select: { id: true } });
  if (!task) {
    throw new HttpError(404, `Không tìm thấy task có id = ${id}`);
  }
}

async function findAll(query: TaskQuery) {
  return prisma.task.findMany({
    where: {
      boardId: query.boardId,
      status: query.status,
      priority: query.priority,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function findById(id: number) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { board: { select: { id: true, name: true } } },
  });
  if (!task) {
    throw new HttpError(404, `Không tìm thấy task có id = ${id}`);
  }
  return task;
}

async function create(data: CreateTaskInput) {
  await boardService.ensureBoardExists(data.boardId);
  return prisma.task.create({ data });
}

async function update(id: number, data: UpdateTaskInput) {
  await ensureTaskExists(id);
  if (data.boardId !== undefined) {
    await boardService.ensureBoardExists(data.boardId);
  }
  return prisma.task.update({ where: { id }, data });
}

async function remove(id: number) {
  await ensureTaskExists(id);
  await prisma.task.delete({ where: { id } });
}

export const taskService = { findAll, findById, create, update, remove };
