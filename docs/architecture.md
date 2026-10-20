# Kiến trúc dự án TeamBoard API

Dự án áp dụng **Clean Architecture** với 4 lớp: Domain, Application, Infrastructure, Presentation.

## 1. Quy tắc phụ thuộc

Phụ thuộc chỉ đi **từ ngoài vào trong**. Lớp trong không biết gì về lớp ngoài.

```
Presentation ─┐
              ├─▶ Application ─▶ Domain
Infrastructure┘                    ▲
        └──────────────────────────┘  (implement interface của Domain)
```

| Lớp | Được import | Không được import |
|---|---|---|
| Domain | (không gì cả) | Application, Infrastructure, Presentation, Prisma, Express |
| Application | Domain | Infrastructure, Presentation, Prisma, Express |
| Infrastructure | Domain, Prisma | Application, Presentation |
| Presentation | Application, Domain, Express, Zod | Use case do chính nó tạo (nhận qua constructor) |

## 2. Cấu trúc thư mục

```
src/
├── domain/
│   ├── entities/        # Board, Task, kiểu input/filter (plain TypeScript)
│   ├── repositories/    # interface BoardRepository, TaskRepository
│   └── errors/          # NotFoundError
├── application/
│   └── use-cases/
│       ├── board/       # get-boards, get-board, create, update, delete
│       └── task/        # get-tasks, get-task, create, update, delete
├── infrastructure/
│   ├── database/        # PrismaClient dùng chung
│   └── repositories/    # PrismaBoardRepository, PrismaTaskRepository
├── presentation/
│   └── http/
│       ├── controllers/ # nhận request, gọi use case, trả response
│       ├── routes/      # factory createBoardRoutes / createTaskRoutes
│       ├── validators/  # schema Zod cho params, query, body
│       ├── middlewares/ # error handler, not found handler
│       ├── docs/        # Swagger spec
│       └── app.ts       # createApp(): dựng Express app
└── main/
    ├── container.ts     # composition root
    └── server.ts        # entry point: listen, graceful shutdown
```

## 3. Vai trò từng lớp

### Domain
Lõi nghiệp vụ, thuần TypeScript.
- **Entities**: `Board`, `Task`, `TaskStatus`, `Priority`, cùng các biến thể như `BoardWithTaskCount`, `TaskWithBoard`.
- **Repository interfaces**: hợp đồng truy cập dữ liệu (`findAll`, `findById`, `exists`, `create`, `update`, `delete`). Domain chỉ khai báo, không biết dữ liệu lưu ở đâu.
- **Errors**: `NotFoundError` biểu diễn lỗi nghiệp vụ, không gắn với HTTP.

### Application
Chứa các **use case**, mỗi class làm đúng một việc và có một method `execute`.
- Nhận repository qua constructor (dependency injection) dưới dạng interface.
- Chứa luật nghiệp vụ, ví dụ: tạo hoặc sửa task phải kiểm tra board tồn tại; sửa hoặc xoá phải kiểm tra bản ghi tồn tại, nếu không ném `NotFoundError`.

### Infrastructure
Chi tiết kỹ thuật bên ngoài.
- `PrismaBoardRepository` và `PrismaTaskRepository` implement interface của Domain bằng Prisma + MySQL.
- Đây là nơi duy nhất truy vấn DB. Việc đổi ORM hoặc DB chỉ ảnh hưởng thư mục này và `container.ts`.

### Presentation
Giao tiếp HTTP.
- **Validators** (Zod) kiểm tra và ép kiểu dữ liệu đầu vào trước khi chuyển cho use case.
- **Controllers** là class nhận use case qua constructor, không chứa logic nghiệp vụ.
- **Error middleware** chuyển lỗi thành HTTP response:

| Lỗi | Status |
|---|---|
| `ZodError` | 400 |
| `NotFoundError` | 404 |
| Prisma `P2025` | 404 |
| Prisma `P2003` | 400 |
| JSON body sai | 400 |
| Lỗi khác | 500 |

- Controller map `taskCount` của domain thành `_count.tasks` để giữ nguyên shape response của API.

### Main (composition root)
`container.ts` là nơi duy nhất biết implementation cụ thể: tạo Prisma repository, inject vào use case, inject use case vào controller. `server.ts` gọi `createApp()` rồi lắng nghe cổng.

## 4. Luồng một request

`POST /api/tasks`

1. Route chuyển tới `TaskController.create`.
2. Controller validate body bằng `createTaskSchema` (Zod).
3. Controller gọi `CreateTaskUseCase.execute(data)`.
4. Use case hỏi `BoardRepository.exists(boardId)`; nếu không có thì ném `NotFoundError`.
5. Use case gọi `TaskRepository.create(data)`, thực thi bởi `PrismaTaskRepository`.
6. Controller trả `201` kèm task vừa tạo. Nếu có lỗi, error middleware xử lý.

## 5. Thêm một tính năng mới

1. Thêm entity hoặc kiểu input và method repository vào `domain/`.
2. Viết use case trong `application/use-cases/`.
3. Implement method trong repository ở `infrastructure/repositories/`.
4. Thêm validator, controller, route và cập nhật Swagger trong `presentation/http/`.
5. Nối dependency trong `main/container.ts`.

## 6. Lợi ích

- **Dễ test**: use case test được bằng repository giả, không cần DB hay Express.
- **Dễ thay đổi**: đổi Prisma sang ORM khác, hoặc Express sang framework khác, không động tới nghiệp vụ.
- **Ranh giới rõ ràng**: mỗi file có đúng một trách nhiệm và vị trí dễ đoán.
