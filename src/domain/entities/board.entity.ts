import type { Task } from './task.entity';

export interface Board {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardWithTaskCount extends Board {
  taskCount: number;
}

export interface BoardWithTasks extends Board {
  tasks: Task[];
}

export interface CreateBoardInput {
  name: string;
  description?: string | null;
}

export type UpdateBoardInput = Partial<CreateBoardInput>;
