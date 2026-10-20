# TeamBoard API Architecture

The project follows **Clean Architecture** with four layers: Domain, Application, Infrastructure and Presentation.

## 1. Dependency rule

Dependencies point **from the outside in**. Inner layers know nothing about outer layers.

```
Presentation ─┐
              ├─▶ Application ─▶ Domain
Infrastructure┘                    ▲
        └──────────────────────────┘  (implements Domain interfaces)
```

| Layer | May import | Must not import |
|---|---|---|
| Domain | (nothing) | Application, Infrastructure, Presentation, Prisma, Express |
| Application | Domain | Infrastructure, Presentation, Prisma, Express |
| Infrastructure | Domain, Prisma | Application, Presentation |
| Presentation | Application, Domain, Express, Zod | Concrete implementations (use cases arrive via constructors) |

## 2. Directory structure

```
src/
├── domain/
│   ├── entities/        # Board, Task, input/filter types (plain TypeScript)
│   ├── repositories/    # BoardRepository, TaskRepository interfaces
│   └── errors/          # NotFoundError
├── application/
│   └── use-cases/
│       ├── board/       # get-boards, get-board, create, update, delete
│       └── task/        # get-tasks, get-task, create, update, delete
├── infrastructure/
│   ├── database/        # shared PrismaClient
│   └── repositories/    # PrismaBoardRepository, PrismaTaskRepository
├── presentation/
│   └── http/
│       ├── controllers/ # receive the request, call a use case, send the response
│       ├── routes/      # createBoardRoutes / createTaskRoutes factories
│       ├── validators/  # Zod schemas for params, query and body
│       ├── middlewares/ # error handler, not-found handler
│       ├── docs/        # Swagger spec
│       └── app.ts       # createApp(): builds the Express app
└── main/
    ├── container.ts     # composition root
    └── server.ts        # entry point: listen, graceful shutdown
```

## 3. Layer responsibilities

### Domain
The business core, pure TypeScript.
- **Entities**: `Board`, `Task`, `TaskStatus`, `Priority`, plus variants such as `BoardWithTaskCount` and `TaskWithBoard`.
- **Repository interfaces**: the data-access contract (`findAll`, `findById`, `exists`, `create`, `update`, `delete`). The domain only declares them and does not know where data is stored.
- **Errors**: `NotFoundError` represents a business error and is not tied to HTTP.

### Application
Contains the **use cases**. Each class does exactly one thing and exposes one `execute` method.
- Repositories are injected through the constructor as interfaces.
- Holds the business rules, for example: creating or updating a task requires the board to exist; updating or deleting requires the record to exist, otherwise `NotFoundError` is thrown.

### Infrastructure
External technical details.
- `PrismaBoardRepository` and `PrismaTaskRepository` implement the Domain interfaces with Prisma + MySQL.
- This is the only place that queries the database. Swapping the ORM or database only affects this folder and `container.ts`.

### Presentation
HTTP communication.
- **Validators** (Zod) validate and coerce input before it reaches a use case.
- **Controllers** are classes that receive use cases through their constructor and contain no business logic.
- **Error middleware** turns errors into HTTP responses:

| Error | Status |
|---|---|
| `ZodError` | 400 |
| `NotFoundError` | 404 |
| Prisma `P2025` | 404 |
| Prisma `P2003` | 400 |
| Malformed JSON body | 400 |
| Anything else | 500 |

- The board controller maps the domain's `taskCount` to `_count.tasks` to keep the API response shape unchanged.

### Main (composition root)
`container.ts` is the only place that knows the concrete implementations: it creates the Prisma repositories, injects them into use cases, and injects use cases into controllers. `server.ts` calls `createApp()` and starts listening.

## 4. Lifecycle of a request

`POST /api/tasks`

1. The route forwards to `TaskController.create`.
2. The controller validates the body with `createTaskSchema` (Zod).
3. The controller calls `CreateTaskUseCase.execute(data)`.
4. The use case asks `BoardRepository.exists(boardId)` and throws `NotFoundError` if the board is missing.
5. The use case calls `TaskRepository.create(data)`, implemented by `PrismaTaskRepository`.
6. The controller responds `201` with the created task. Any error is handled by the error middleware.

## 5. Adding a new feature

1. Add the entity or input type and the repository method in `domain/`.
2. Write the use case in `application/use-cases/`.
3. Implement the method in `infrastructure/repositories/`.
4. Add the validator, controller and route, and update Swagger, in `presentation/http/`.
5. Wire the dependencies in `main/container.ts`.

## 6. Benefits

- **Testable**: use cases can be tested with fake repositories, without a database or Express.
- **Easy to change**: replacing Prisma with another ORM, or Express with another framework, does not touch the business logic.
- **Clear boundaries**: every file has a single responsibility and a predictable location.
