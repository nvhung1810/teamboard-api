export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  boardId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWithBoard extends Task {
  board: { id: number; name: string };
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: Date | null;
  boardId: number;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

export interface TaskFilter {
  boardId?: number;
  status?: TaskStatus;
  priority?: Priority;
}
