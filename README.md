# TeamBoard API — Express + TypeScript + Prisma + MySQL

Hướng dẫn dựng từ đầu một REST API quản lý **Board** và **Task**, có CRUD đầy đủ, validate dữ liệu, xử lý lỗi tập trung và test qua Swagger UI.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Chuẩn bị môi trường](#2-chuẩn-bị-môi-trường)
3. [Khởi tạo project](#3-khởi-tạo-project)
4. [Cấu hình TypeScript và scripts](#4-cấu-hình-typescript-và-scripts)
5. [Chạy MySQL](#5-chạy-mysql)
6. [Prisma: schema và migration](#6-prisma-schema-và-migration)
7. [Cấu trúc thư mục](#7-cấu-trúc-thư-mục)
8. [Viết code](#8-viết-code)
9. [Swagger](#9-swagger)
10. [Chạy và test trên Swagger](#10-chạy-và-test-trên-swagger)
11. [Đẩy code lên GitHub](#11-đẩy-code-lên-github)
12. [Bảng đối chiếu với ASP.NET Core + EF Core](#12-bảng-đối-chiếu-với-aspnet-core--ef-core)
13. [Lỗi thường gặp](#13-lỗi-thường-gặp)

---

## 1. Tổng quan

### Công nghệ

| Thành phần | Công cụ | Vai trò |
|---|---|---|
| Runtime | Node.js 20+ | Chạy JavaScript phía server |
| Ngôn ngữ | TypeScript 5 | Kiểu tĩnh, bắt lỗi sớm |
| Web framework | Express 5 | Định tuyến, middleware |
| ORM | Prisma 6 | Thay cho EF Core: model, migration, truy vấn |
| Database | MySQL 8 | Lưu dữ liệu |
| Validation | Zod 4 | Kiểm tra dữ liệu request |
| API docs | swagger-ui-express | Giao diện test API |
| Dev server | tsx | Chạy TypeScript trực tiếp, tự reload |

> Phiên bản được ghim major (`prisma@6`, `typescript@5`, ...) để code trong tài liệu chạy đúng. Prisma 7 thay đổi khá nhiều cách cấu hình (bắt buộc driver adapter, file `prisma.config.ts`), không phù hợp cho người mới.

### Mô hình dữ liệu

Một **Board** có nhiều **Task** (quan hệ 1–N). Xoá Board thì các Task bên trong bị xoá theo (cascade).

```
┌──────────────────┐         ┌──────────────────────┐
│      Board       │         │         Task         │
├──────────────────┤         ├──────────────────────┤
│ id          PK   │◄───┐    │ id            PK     │
│ name             │    │    │ title                │
│ description      │    └────│ boardId       FK     │
│ createdAt        │   1 : N │ description          │
│ updatedAt        │         │ status   (enum)      │
└──────────────────┘         │ priority (enum)      │
                             │ dueDate              │
                             │ createdAt, updatedAt │
                             └──────────────────────┘
```

### Danh sách API

| Method | Endpoint | Mô tả | Thành công |
|---|---|---|---|
| GET | `/api/boards` | Danh sách board (kèm số task) | 200 |
| GET | `/api/boards/:id` | Chi tiết board (kèm danh sách task) | 200 |
| POST | `/api/boards` | Tạo board | 201 |
| PUT | `/api/boards/:id` | Sửa board | 200 |
| DELETE | `/api/boards/:id` | Xoá board (và task bên trong) | 204 |
| GET | `/api/tasks` | Danh sách task, lọc `?boardId=&status=&priority=` | 200 |
| GET | `/api/tasks/:id` | Chi tiết task | 200 |
| POST | `/api/tasks` | Tạo task | 201 |
| PUT | `/api/tasks/:id` | Sửa task | 200 |
| DELETE | `/api/tasks/:id` | Xoá task | 204 |

Lỗi trả về: `400` dữ liệu sai, `404` không tìm thấy, `500` lỗi server.

> **Ghi chú về PUT:** trong project này `PUT` cho phép gửi một phần các trường (chỉ cập nhật trường được gửi). Theo chuẩn REST nghiêm ngặt thì đó là `PATCH`, nhưng cách làm này phổ biến và dễ test hơn.

---

## 2. Chuẩn bị môi trường

Cài sẵn:

- **Node.js 20 trở lên** — kiểm tra bằng `node -v`
- **MySQL 8** — cài trực tiếp, hoặc dùng **Docker Desktop** (khuyên dùng, xem mục 5)
- **Git** và tài khoản **GitHub**
- Editor: VS Code, nên cài extension **Prisma** để có highlight cho file `.prisma`

---

## 3. Khởi tạo project

```bash
mkdir teamboard-api
cd teamboard-api
npm init -y
```

Cài thư viện chạy chính:

```bash
npm install express@5 @prisma/client@6 zod@4 swagger-ui-express cors dotenv
```

Cài thư viện cho môi trường dev:

```bash
npm install -D typescript@5 tsx prisma@6 @types/node @types/express@5 @types/swagger-ui-express @types/cors
```

---

## 4. Cấu hình TypeScript và scripts

Tạo file `tsconfig.json` ở thư mục gốc:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

Mở `package.json`, sửa phần `scripts`:

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio",
  "db:generate": "prisma generate"
}
```

| Script | Dùng khi |
|---|---|
| `npm run dev` | Phát triển, tự reload khi sửa code |
| `npm run build` + `npm start` | Chạy bản build như production |
| `npm run db:migrate` | Tạo/áp migration sau khi sửa schema |
| `npm run db:studio` | Mở giao diện web xem dữ liệu trong DB |

---

## 5. Chạy MySQL

### Cách A — Docker (khuyên dùng)

Tạo file `docker-compose.yml`:

```yaml
services:
  mysql:
    image: mysql:8.4
    container_name: teamboard-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: teamboard
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

```bash
docker compose up -d
```

### Cách B — MySQL cài sẵn trên máy

Đăng nhập MySQL và tạo database:

```sql
CREATE DATABASE teamboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### File môi trường

Tạo `.env` (file này **không** đẩy lên GitHub):

```env
DATABASE_URL="mysql://root:password@localhost:3306/teamboard"
PORT=3000
```

Tạo `.env.example` (file này **có** đẩy lên GitHub, để người khác biết cần cấu hình gì):

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/teamboard"
PORT=3000
```

> Nếu mật khẩu có ký tự đặc biệt như `@`, `#`, `:` thì phải URL-encode (ví dụ `@` thành `%40`).

---

## 6. Prisma: schema và migration

Khởi tạo Prisma:

```bash
npx prisma init --datasource-provider mysql
```

Lệnh này tạo thư mục `prisma/` với file `schema.prisma`. Thay toàn bộ nội dung file đó bằng:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

model Board {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(100)
  description String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tasks       Task[]

  @@map("boards")
}

model Task {
  id          Int        @id @default(autoincrement())
  title       String     @db.VarChar(200)
  description String?    @db.Text
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  boardId     Int
  board       Board      @relation(fields: [boardId], references: [id], onDelete: Cascade)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([boardId])
  @@map("tasks")
}
```

Giải thích nhanh:

- `@id @default(autoincrement())` — khoá chính tự tăng.
- `String?` — cột cho phép `NULL`.
- `@updatedAt` — Prisma tự cập nhật thời gian mỗi lần sửa.
- `@relation(... onDelete: Cascade)` — khoá ngoại, xoá Board thì xoá Task theo.
- `@@map("boards")` — tên bảng thật trong MySQL.

Tạo migration và bảng:

```bash
npx prisma migrate dev --name init
```

Lệnh này làm 3 việc: sinh file SQL trong `prisma/migrations/`, chạy SQL đó vào MySQL, và generate Prisma Client (có type cho TypeScript).

Mỗi lần sửa `schema.prisma` sau này, chạy lại `npx prisma migrate dev --name <ten-thay-doi>`.

---

## 7. Cấu trúc thư mục

```
teamboard-api/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   │   ├── board.controller.ts
│   │   └── task.controller.ts
│   ├── docs/
│   │   └── swagger.ts
│   ├── lib/
│   │   └── prisma.ts
│   ├── middlewares/
│   │   └── error.middleware.ts
│   ├── routes/
│   │   ├── board.routes.ts
│   │   └── task.routes.ts
│   ├── services/
│   │   ├── board.service.ts
│   │   └── task.service.ts
│   ├── utils/
│   │   └── http-error.ts
│   ├── validators/
│   │   ├── board.validator.ts
│   │   ├── common.validator.ts
│   │   └── task.validator.ts
│   ├── app.ts
│   └── server.ts
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

Luồng xử lý một request:

```
Request → Route → Controller → (Validator) → Service → Prisma → MySQL
                       │
                       └── lỗi ném ra → Error middleware → Response lỗi
```

| Lớp | Trách nhiệm |
|---|---|
| **Route** | Khai báo URL và method, trỏ tới controller |
| **Controller** | Đọc `req`, validate, gọi service, trả `res` với status code |
| **Validator** | Định nghĩa dữ liệu hợp lệ bằng Zod |
| **Service** | Logic nghiệp vụ, truy vấn DB qua Prisma |
| **Middleware lỗi** | Chuyển mọi lỗi thành response JSON thống nhất |

---

## 8. Viết code

### 8.1. `src/lib/prisma.ts` — một instance Prisma dùng chung

```ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

### 8.2. `src/utils/http-error.ts` — lỗi có status code

```ts
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
```

### 8.3. Validators

`src/validators/common.validator.ts`

```ts
import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('id phải là số nguyên dương'),
});
```

`src/validators/board.validator.ts`

```ts
import { z } from 'zod';

export const createBoardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên board không được để trống')
    .max(100, 'Tên board tối đa 100 ký tự'),
  description: z.string().max(1000).nullable().optional(),
});

export const updateBoardSchema = createBoardSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Cần gửi ít nhất một trường để cập nhật',
  });

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
```

`src/validators/task.validator.ts`

```ts
import { z } from 'zod';

export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);
export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Tiêu đề không được để trống')
    .max(200, 'Tiêu đề tối đa 200 ký tự'),
  description: z.string().max(5000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  boardId: z.number().int().positive('boardId phải là số nguyên dương'),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Cần gửi ít nhất một trường để cập nhật',
  });

export const taskQuerySchema = z.object({
  boardId: z.coerce.number().int().positive().optional(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
```

### 8.4. Services

`src/services/board.service.ts`

```ts
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
```

`src/services/task.service.ts`

```ts
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
```

> Prisma bỏ qua các trường có giá trị `undefined` trong `where` và `data`, nên khi không truyền `boardId` thì bộ lọc đó không được áp dụng, và khi update chỉ gửi `title` thì các trường khác giữ nguyên.

### 8.5. Controllers

Express 5 tự chuyển lỗi trong hàm `async` sang error middleware, nên không cần `try/catch` hay hàm bọc `asyncHandler`.

`src/controllers/board.controller.ts`

```ts
import type { Request, Response } from 'express';
import { boardService } from '../services/board.service';
import { idParamSchema } from '../validators/common.validator';
import { createBoardSchema, updateBoardSchema } from '../validators/board.validator';

export const boardController = {
  async getAll(_req: Request, res: Response) {
    const boards = await boardService.findAll();
    res.json(boards);
  },

  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const board = await boardService.findById(id);
    res.json(board);
  },

  async create(req: Request, res: Response) {
    const data = createBoardSchema.parse(req.body);
    const board = await boardService.create(data);
    res.status(201).json(board);
  },

  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const data = updateBoardSchema.parse(req.body);
    const board = await boardService.update(id, data);
    res.json(board);
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await boardService.remove(id);
    res.status(204).send();
  },
};
```

`src/controllers/task.controller.ts`

```ts
import type { Request, Response } from 'express';
import { taskService } from '../services/task.service';
import { idParamSchema } from '../validators/common.validator';
import { createTaskSchema, taskQuerySchema, updateTaskSchema } from '../validators/task.validator';

export const taskController = {
  async getAll(req: Request, res: Response) {
    const query = taskQuerySchema.parse(req.query);
    const tasks = await taskService.findAll(query);
    res.json(tasks);
  },

  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const task = await taskService.findById(id);
    res.json(task);
  },

  async create(req: Request, res: Response) {
    const data = createTaskSchema.parse(req.body);
    const task = await taskService.create(data);
    res.status(201).json(task);
  },

  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const data = updateTaskSchema.parse(req.body);
    const task = await taskService.update(id, data);
    res.json(task);
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await taskService.remove(id);
    res.status(204).send();
  },
};
```

### 8.6. Routes

`src/routes/board.routes.ts`

```ts
import { Router } from 'express';
import { boardController } from '../controllers/board.controller';

const router = Router();

router.get('/', boardController.getAll);
router.get('/:id', boardController.getById);
router.post('/', boardController.create);
router.put('/:id', boardController.update);
router.delete('/:id', boardController.remove);

export default router;
```

`src/routes/task.routes.ts`

```ts
import { Router } from 'express';
import { taskController } from '../controllers/task.controller';

const router = Router();

router.get('/', taskController.getAll);
router.get('/:id', taskController.getById);
router.post('/', taskController.create);
router.put('/:id', taskController.update);
router.delete('/:id', taskController.remove);

export default router;
```

### 8.7. `src/middlewares/error.middleware.ts`

```ts
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/http-error';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Không tồn tại route ${req.method} ${req.originalUrl}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Lỗi validate từ Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Dữ liệu không hợp lệ',
      errors: err.issues.map((issue) => ({
        field: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // Lỗi tự ném trong service
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  // Lỗi đã biết từ Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Không tìm thấy bản ghi' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({ message: 'Khoá ngoại không hợp lệ' });
      return;
    }
  }

  // Body gửi lên không phải JSON hợp lệ
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ message: 'Body không phải JSON hợp lệ' });
    return;
  }

  console.error(err);
  res.status(500).json({ message: 'Lỗi máy chủ' });
};
```

### 8.8. `src/app.ts`

```ts
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import boardRoutes from './routes/board.routes';
import taskRoutes from './routes/task.routes';
import { swaggerSpec } from './docs/swagger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.redirect('/api-docs');
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

app.use('/api/boards', boardRoutes);
app.use('/api/tasks', taskRoutes);

// Hai middleware này phải đặt cuối cùng
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

### 8.9. `src/server.ts`

```ts
import 'dotenv/config';
import app from './app';
import { prisma } from './lib/prisma';

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
  console.log(`Swagger UI:     http://localhost:${PORT}/api-docs`);
});

async function shutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

---

## 9. Swagger

Có hai cách viết tài liệu Swagger trong Express: viết comment JSDoc trên từng route (dùng `swagger-jsdoc`), hoặc viết thẳng đặc tả OpenAPI thành một object TypeScript. Tài liệu này dùng cách thứ hai vì ít lỗi thụt lề YAML và dễ sửa.

`src/docs/swagger.ts`

```ts
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const jsonBody = (schema: object) => ({ 'application/json': { schema } });

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 },
};

const badRequest = { description: 'Dữ liệu không hợp lệ', content: jsonBody(ref('ValidationError')) };
const notFound = { description: 'Không tìm thấy', content: jsonBody(ref('Error')) };

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TeamBoard API',
    version: '1.0.0',
    description: 'API quản lý Board và Task — Express + TypeScript + Prisma + MySQL',
  },
  tags: [
    { name: 'Boards', description: 'Quản lý board' },
    { name: 'Tasks', description: 'Quản lý task' },
  ],
  paths: {
    '/api/boards': {
      get: {
        tags: ['Boards'],
        summary: 'Lấy danh sách board',
        responses: {
          200: { description: 'OK', content: jsonBody({ type: 'array', items: ref('BoardWithCount') }) },
        },
      },
      post: {
        tags: ['Boards'],
        summary: 'Tạo board mới',
        requestBody: { required: true, content: jsonBody(ref('BoardCreate')) },
        responses: {
          201: { description: 'Đã tạo', content: jsonBody(ref('Board')) },
          400: badRequest,
        },
      },
    },
    '/api/boards/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Boards'],
        summary: 'Xem chi tiết board (kèm task)',
        responses: {
          200: { description: 'OK', content: jsonBody(ref('BoardDetail')) },
          400: badRequest,
          404: notFound,
        },
      },
      put: {
        tags: ['Boards'],
        summary: 'Cập nhật board',
        requestBody: { required: true, content: jsonBody(ref('BoardUpdate')) },
        responses: {
          200: { description: 'Đã cập nhật', content: jsonBody(ref('Board')) },
          400: badRequest,
          404: notFound,
        },
      },
      delete: {
        tags: ['Boards'],
        summary: 'Xoá board (xoá luôn các task bên trong)',
        responses: {
          204: { description: 'Đã xoá' },
          400: badRequest,
          404: notFound,
        },
      },
    },
    '/api/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Lấy danh sách task',
        parameters: [
          { name: 'boardId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] } },
        ],
        responses: {
          200: { description: 'OK', content: jsonBody({ type: 'array', items: ref('Task') }) },
          400: badRequest,
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Tạo task mới',
        requestBody: { required: true, content: jsonBody(ref('TaskCreate')) },
        responses: {
          201: { description: 'Đã tạo', content: jsonBody(ref('Task')) },
          400: badRequest,
          404: { description: 'Board không tồn tại', content: jsonBody(ref('Error')) },
        },
      },
    },
    '/api/tasks/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Tasks'],
        summary: 'Xem chi tiết task',
        responses: {
          200: { description: 'OK', content: jsonBody(ref('Task')) },
          400: badRequest,
          404: notFound,
        },
      },
      put: {
        tags: ['Tasks'],
        summary: 'Cập nhật task',
        requestBody: { required: true, content: jsonBody(ref('TaskUpdate')) },
        responses: {
          200: { description: 'Đã cập nhật', content: jsonBody(ref('Task')) },
          400: badRequest,
          404: notFound,
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Xoá task',
        responses: {
          204: { description: 'Đã xoá' },
          400: badRequest,
          404: notFound,
        },
      },
    },
  },
  components: {
    schemas: {
      Board: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Sprint 1' },
          description: { type: 'string', nullable: true, example: 'Các việc của sprint đầu tiên' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BoardWithCount: {
        allOf: [
          ref('Board'),
          {
            type: 'object',
            properties: {
              _count: { type: 'object', properties: { tasks: { type: 'integer', example: 3 } } },
            },
          },
        ],
      },
      BoardDetail: {
        allOf: [
          ref('Board'),
          { type: 'object', properties: { tasks: { type: 'array', items: ref('Task') } } },
        ],
      },
      BoardCreate: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 100, example: 'Sprint 1' },
          description: { type: 'string', nullable: true, example: 'Các việc của sprint đầu tiên' },
        },
      },
      BoardUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 100, example: 'Sprint 1 (đã sửa)' },
          description: { type: 'string', nullable: true },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Thiết kế database' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          boardId: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TaskCreate: {
        type: 'object',
        required: ['title', 'boardId'],
        properties: {
          title: { type: 'string', maxLength: 200, example: 'Thiết kế database' },
          description: { type: 'string', nullable: true, example: 'Vẽ ERD cho Board và Task' },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], example: 'TODO' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'HIGH' },
          dueDate: { type: 'string', format: 'date-time', nullable: true, example: '2026-12-31T17:00:00.000Z' },
          boardId: { type: 'integer', example: 1 },
        },
      },
      TaskUpdate: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], example: 'IN_PROGRESS' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          boardId: { type: 'integer' },
        },
      },
      Error: {
        type: 'object',
        properties: { message: { type: 'string', example: 'Không tìm thấy board có id = 99' } },
      },
      ValidationError: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Dữ liệu không hợp lệ' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'name' },
                message: { type: 'string', example: 'Tên board không được để trống' },
              },
            },
          },
        },
      },
    },
  },
};
```

---

## 10. Chạy và test trên Swagger

```bash
npm run dev
```

Mở trình duyệt: **http://localhost:3000/api-docs**

Với mỗi endpoint: bấm vào endpoint → **Try it out** → nhập dữ liệu → **Execute** → xem phần **Responses**.

### Kịch bản test gợi ý (làm theo thứ tự)

**Board**

| # | Thao tác | Dữ liệu | Kết quả mong đợi |
|---|---|---|---|
| 1 | `POST /api/boards` | `{ "name": "Sprint 1", "description": "Việc tuần 1" }` | 201, trả về board có `id` |
| 2 | `POST /api/boards` | `{ "name": "Backlog" }` | 201 |
| 3 | `GET /api/boards` | — | 200, mảng 2 board, `_count.tasks = 0` |
| 4 | `GET /api/boards/{id}` | id = 1 | 200, có `tasks: []` |
| 5 | `PUT /api/boards/{id}` | id = 1, `{ "name": "Sprint 1 - updated" }` | 200, tên đã đổi |
| 6 | `POST /api/boards` | `{ "name": "" }` | 400, lỗi ở field `name` |
| 7 | `GET /api/boards/{id}` | id = 999 | 404 |

**Task**

| # | Thao tác | Dữ liệu | Kết quả mong đợi |
|---|---|---|---|
| 8 | `POST /api/tasks` | `{ "title": "Thiết kế DB", "priority": "HIGH", "boardId": 1 }` | 201, `status` mặc định `TODO` |
| 9 | `POST /api/tasks` | `{ "title": "Viết API", "boardId": 1, "dueDate": "2026-12-31" }` | 201 |
| 10 | `POST /api/tasks` | `{ "title": "Task lạc", "boardId": 999 }` | 404, board không tồn tại |
| 11 | `POST /api/tasks` | `{ "title": "X", "boardId": 1, "status": "ABC" }` | 400, lỗi ở field `status` |
| 12 | `GET /api/tasks?boardId=1` | — | 200, 2 task |
| 13 | `PUT /api/tasks/{id}` | id = 1, `{ "status": "DONE" }` | 200, chỉ `status` đổi |
| 14 | `GET /api/tasks?status=DONE` | — | 200, 1 task |
| 15 | `DELETE /api/tasks/{id}` | id = 2 | 204 |
| 16 | `DELETE /api/boards/{id}` | id = 1 | 204, task id = 1 cũng bị xoá |
| 17 | `GET /api/tasks/{id}` | id = 1 | 404 (đã bị cascade) |

Có thể mở `npm run db:studio` song song để nhìn dữ liệu thay đổi trong DB sau mỗi thao tác.

---

## 11. Đẩy code lên GitHub

### `.gitignore`

```gitignore
node_modules/
dist/
.env
*.log
.DS_Store
```

> **Quan trọng:** `.env` chứa mật khẩu DB, tuyệt đối không commit. Thư mục `prisma/migrations/` thì **phải** commit để người khác tạo được bảng giống bạn.

### `README.md` mẫu cho repo

````markdown
# TeamBoard API

REST API quản lý Board và Task — Express + TypeScript + Prisma + MySQL.

## Yêu cầu
- Node.js 20+
- MySQL 8 (hoặc Docker)

## Cài đặt
```bash
git clone https://github.com/<username>/teamboard-api.git
cd teamboard-api
npm install
cp .env.example .env        # sửa DATABASE_URL cho đúng máy bạn
docker compose up -d        # nếu dùng Docker cho MySQL
npx prisma migrate dev
npm run dev
```

## Swagger
http://localhost:3000/api-docs

## API
| Method | Endpoint |
|---|---|
| GET/POST | /api/boards |
| GET/PUT/DELETE | /api/boards/:id |
| GET/POST | /api/tasks |
| GET/PUT/DELETE | /api/tasks/:id |
````

### Các lệnh Git

Tạo repo trống trên GitHub (không tick thêm README hay .gitignore), rồi:

```bash
git init
git add .
git commit -m "Init TeamBoard API: Express + TypeScript + Prisma + MySQL"
git branch -M main
git remote add origin https://github.com/<username>/teamboard-api.git
git push -u origin main
```

Trước khi push, chạy `git status` và kiểm tra **không** có `.env` hay `node_modules` trong danh sách.

Gợi ý chia commit theo từng bước để lịch sử repo dễ đọc:

1. `chore: init project, typescript config`
2. `feat: prisma schema Board & Task, initial migration`
3. `feat: CRUD Board`
4. `feat: CRUD Task`
5. `feat: validation & error handling`
6. `docs: swagger, README`

---

## 12. Bảng đối chiếu với ASP.NET Core + EF Core

Hữu ích khi phải giải thích lựa chọn công nghệ cho người giao bài.

| ASP.NET Core + EF Core | Project này |
|---|---|
| Entity class + `DbContext` | `schema.prisma` |
| `Add-Migration` / `dotnet ef migrations add` | `npx prisma migrate dev --name ...` |
| `Update-Database` | (gộp chung trong `prisma migrate dev`) |
| `_context.Boards.Include(b => b.Tasks)` | `prisma.board.findUnique({ include: { tasks: true } })` |
| Controller `[ApiController]` | `controllers/` + `routes/` |
| Data Annotations / FluentValidation | Zod |
| Exception middleware / `ProblemDetails` | `error.middleware.ts` |
| Swashbuckle | swagger-ui-express |
| `appsettings.json` connection string | `.env` → `DATABASE_URL` |
| `Program.cs` | `app.ts` + `server.ts` |

---

## 13. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Can't reach database server at localhost:3306` | MySQL chưa chạy hoặc sai port | `docker compose up -d` hoặc bật service MySQL |
| `Authentication failed against database server` | Sai user/mật khẩu trong `DATABASE_URL` | Kiểm tra lại `.env`, URL-encode ký tự đặc biệt |
| `Prisma schema validation ... url` / không đọc được `DATABASE_URL` | Thiếu file `.env` hoặc đặt sai thư mục | `.env` phải nằm ở thư mục gốc project |
| `P3014 ... shadow database` | User MySQL không có quyền tạo database | Dùng user `root` khi dev, hoặc cấp quyền `CREATE` |
| `Module '"@prisma/client"' has no exported member 'PrismaClient'` | Chưa generate client | `npx prisma generate` |
| Sửa schema nhưng code không thấy trường mới | Chưa chạy migrate | `npx prisma migrate dev --name <ten>` |
| `EADDRINUSE :::3000` | Cổng 3000 đang bị chiếm | Đổi `PORT` trong `.env` |
| Swagger gửi request nhưng body rỗng | Quên `app.use(express.json())` hoặc đặt sau route | Đặt `express.json()` trước khi khai báo route |
| Lỗi không được bắt, server trả HTML | Error middleware đặt trước route | `notFoundHandler` và `errorHandler` phải ở cuối `app.ts` |

---

## Mở rộng (không bắt buộc)

- **Phân trang:** thêm `?page=&limit=` cho `GET /api/boards` và `GET /api/tasks`, dùng `skip` / `take` của Prisma.
- **Seed dữ liệu mẫu:** viết `prisma/seed.ts` tạo sẵn vài board và task.
- **Test tự động:** Vitest + Supertest cho từng endpoint.
- **Endpoint lồng:** `GET /api/boards/:id/tasks` để lấy task theo board.
- **Sắp xếp:** `?sortBy=dueDate&order=asc`.