import type {
  CreateTaskInput,
  Task,
  TaskFilter,
  TaskWithBoard,
  UpdateTaskInput,
} from '../entities/task.entity';

export interface TaskRepository {
  findAll(filter: TaskFilter): Promise<Task[]>;
  findById(id: number): Promise<TaskWithBoard | null>;
  exists(id: number): Promise<boolean>;
  create(data: CreateTaskInput): Promise<Task>;
  update(id: number, data: UpdateTaskInput): Promise<Task>;
  delete(id: number): Promise<void>;
}
