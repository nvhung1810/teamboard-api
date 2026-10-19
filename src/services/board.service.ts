import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/http-error';
import type { CreateBoardInput, UpdateBoardInput } from '../validators/board.validator';

async function ensureBoardExists(id: number) {
  const board = await prisma.board.findUnique({ where: { id }, select: { id: true } });
  if (!board) {
    throw new HttpError(404, `Không tìm thấy board có id = ${id}`);
  }
}

async function findAll() {
  return prisma.board.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { tasks: true } } },
  });
}

async function findById(id: number) {
  const board = await prisma.board.findUnique({
    where: { id },
    include: { tasks: { orderBy: { createdAt: 'desc' } } },
  });
  if (!board) {
    throw new HttpError(404, `Không tìm thấy board có id = ${id}`);
  }
  return board;
}

async function create(data: CreateBoardInput) {
  return prisma.board.create({ data });
}

async function update(id: number, data: UpdateBoardInput) {
  await ensureBoardExists(id);
  return prisma.board.update({ where: { id }, data });
}

async function remove(id: number) {
  await ensureBoardExists(id);
  await prisma.board.delete({ where: { id } });
}

export const boardService = { findAll, findById, create, update, remove, ensureBoardExists };
