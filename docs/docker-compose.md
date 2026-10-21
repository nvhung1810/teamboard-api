# Chạy API + MySQL bằng Docker Compose

## Mục tiêu
Một lệnh `docker compose up -d` dựng cả API và database. Cấu hình và mật khẩu đi qua biến môi trường (không hard-code). API tự báo được tình trạng DB qua `/health`. Dữ liệu vẫn còn sau `docker compose down` rồi `up`.

## Khái niệm
- **Compose**: file YAML mô tả nhiều container (service) chạy cùng nhau; Docker tự tạo network chung, nên service gọi nhau bằng **tên service** (ví dụ `db`).
- **Named volume**: vùng lưu trữ do Docker quản lý, sống độc lập với container. Xoá container không mất dữ liệu; chỉ `down -v` mới xoá volume.
- **Healthcheck**: một lệnh Docker chạy định kỳ trong container để biết nó "sẵn sàng" chưa (khác với "đang chạy").
- **Health endpoint**: một route HTTP để người/hệ thống giám sát hỏi "app và các phụ thuộc còn ổn không".

## Bảng quy đổi từ đề bài (.NET + SQL Server) sang repo này
| Đề bài | Repo này | Lý do |
|---|---|---|
| `ConnectionStrings__Default` | `DATABASE_URL` | Prisma đã đọc biến này sẵn |
| `AddHealthChecks()` + check DB | route `GET /health` chạy `SELECT 1` | Express không có sẵn health check framework |
| SQL Server 2022 | MySQL 8.4 | Schema Prisma là `mysql`; giữ nguyên mục đích bài tập |
| `SA_PASSWORD` | `MYSQL_ROOT_PASSWORD` | Biến tương đương của image MySQL |

## Giải thích từng thành phần

### 1. Endpoint `/health`
Files: [app.ts](../src/presentation/http/app.ts), [container.ts](../src/main/container.ts), [server.ts](../src/main/server.ts).

```ts
// container.ts
export async function checkDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

// app.ts
app.get('/health', async (_req, res) => {
  try {
    await checkDatabase();
    res.status(200).json({ status: 'Healthy', database: 'Healthy' });
  } catch {
    res.status(503).json({ status: 'Unhealthy', database: 'Unhealthy' });
  }
});
```
- `SELECT 1` là câu truy vấn rẻ nhất để chứng minh Prisma kết nối và DB trả lời được.
- DB chết -> `$queryRaw` ném lỗi -> trả **503 Service Unavailable**. Mã 503 (không phải 200) để load balancer / `curl -f` / healthcheck của Docker nhận ra lỗi mà không cần đọc body.
- `checkDatabase` được **truyền vào `createApp` như một dependency**, không import Prisma trong tầng presentation. Nhờ vậy giữ đúng Clean Architecture (composition root ở `container.ts` là nơi duy nhất biết Prisma, xem [architecture.md](architecture.md)) và dễ thay bằng hàm giả khi test.
- `/health` đặt trước `notFoundHandler`, nếu không sẽ bị bắt thành 404.

### 2. Service `db` trong [docker-compose.yml](../docker-compose.yml)
```yaml
db:
  image: mysql:8.4
  environment:
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?set MYSQL_ROOT_PASSWORD in .env}
    MYSQL_DATABASE: ${MYSQL_DATABASE:-teamboard}
  ports: ["3306:3306"]
  volumes: [mysql_data:/var/lib/mysql]
  healthcheck: ...
```
- `${MYSQL_ROOT_PASSWORD:?...}`: Compose đọc giá trị từ file `.env` cùng thư mục. Dấu `:?` làm lệnh **dừng với thông báo lỗi** nếu thiếu biến, thay vì lặng lẽ chạy với mật khẩu rỗng.
- `${MYSQL_DATABASE:-teamboard}`: dùng giá trị mặc định `teamboard` nếu chưa đặt.
- `mysql_data:/var/lib/mysql`: `/var/lib/mysql` là nơi MySQL ghi dữ liệu; gắn named volume vào đó nên dữ liệu tồn tại qua `down`/`up`.
- `ports 3306`: để bạn vẫn kết nối từ máy host (Prisma Studio, `npm run dev`). API trong Docker **không** dùng cổng này, nó gọi thẳng `db:3306` trong network nội bộ.
- **Healthcheck** (phần nâng cao):
  ```yaml
  test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -uroot -p$$MYSQL_ROOT_PASSWORD --silent"]
  interval: 5s
  timeout: 5s
  retries: 20
  start_period: 20s
  ```
  `$$` để Compose không tự thay biến, mà để shell trong container đọc `MYSQL_ROOT_PASSWORD`. `mysqladmin ping` thành công khi MySQL nhận kết nối. `start_period` cho MySQL thời gian khởi tạo lần đầu mà chưa tính là thất bại. Dùng `127.0.0.1` vì trong lúc khởi tạo MySQL có giai đoạn chỉ nghe socket nội bộ.

### 3. Service `api`
```yaml
api:
  build: .
  depends_on:
    db:
      condition: service_healthy
  environment:
    DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD}@db:3306/${MYSQL_DATABASE:-teamboard}
    PORT: 8080
  ports: ["${API_PORT:-8080}:8080"]
```
- `build: .`: dựng image từ [Dockerfile](../Dockerfile) ở thư mục gốc.
- `depends_on ... service_healthy`: `api` chỉ khởi động khi `db` **healthy**. `depends_on` thường chỉ đợi container "started", mà MySQL cần vài giây nữa mới nhận kết nối, nên không có điều kiện này thì migration sẽ lỗi.
- `@db:3306`: host là **tên service**, không phải `localhost` (trong container, `localhost` là chính container api).
- `DATABASE_URL` được ghép từ `.env` nên không có mật khẩu viết cứng trong YAML. Nếu mật khẩu chứa ký tự đặc biệt (`@ : / #`) phải URL-encode.
- `.env` không được copy vào image (xem [.dockerignore](../.dockerignore)); Compose chỉ dùng nó để thay biến lúc chạy.
- `${API_PORT:-8080}:8080`: cổng trên máy host : cổng trong container. Đổi `API_PORT` nếu 8080 bị chiếm.

### 4. Chạy migration khi container khởi động
[Dockerfile](../Dockerfile):
```dockerfile
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main/server.js"]
```
- DB mới tinh chưa có bảng; `prisma migrate deploy` áp dụng các migration trong `prisma/migrations` (chạy lại nhiều lần vẫn an toàn, chỉ áp dụng cái còn thiếu). `&&` đảm bảo migration lỗi thì server không start.
- `prisma` (CLI) chuyển từ `devDependencies` sang `dependencies` trong [package.json](../package.json), vì stage build chạy `npm prune --omit=dev` và sẽ xoá CLI nếu nó là dev dependency.
- Khác `migrate dev` (chỉ dùng khi phát triển, có thể tạo migration/reset DB): `deploy` không bao giờ reset.

### 5. Quản lý bí mật: `.env` và `.env.example`
- [.env](../.env): chứa giá trị thật, nằm trong `.gitignore` nên **không commit**.
- [.env.example](../.env.example): mẫu có placeholder `change_me`, **được commit** để người khác biết cần những biến nào: `cp .env.example .env` rồi sửa.
- Các biến: `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `API_PORT` (cho Compose); `DATABASE_URL`, `PORT` (cho chạy `npm run dev` ngoài Docker, trỏ tới `localhost`).

### 6. Named volume `mysql_data`
Khai báo ở cuối file compose. Docker lưu thực tế ở `teamboard-api_mysql_data` (tiền tố là tên thư mục project).
- `docker compose down`: xoá container + network, **giữ volume**.
- `docker compose down -v`: xoá luôn volume, **mất dữ liệu**.
- Lưu ý: MySQL chỉ đọc `MYSQL_ROOT_PASSWORD` khi khởi tạo volume **lần đầu**. Đổi biến này sau đó không đổi mật khẩu trong DB; cần xoá volume hoặc đổi bằng SQL.

## Cách dùng
```bash
cp .env.example .env            # sửa MYSQL_ROOT_PASSWORD
docker compose up -d --build
docker compose ps
curl -i localhost:8080/health
docker compose logs -f api
docker compose down             # dừng, giữ dữ liệu
```

## Kết quả kiểm tra (2026-10-21, Docker Desktop, macOS)
| Tiêu chí | Kết quả |
|---|---|
| `up -d` -> 2 container chạy | `teamboard-api` Up, `teamboard-mysql` Up (healthy) |
| `/health` khi DB chạy | 200 `{"status":"Healthy","database":"Healthy"}` |
| `/health` sau `docker compose stop db` | 503 `{"status":"Unhealthy","database":"Unhealthy"}`; `start db` xong thì về Healthy |
| `down` rồi `up` | board `persist-test` tạo trước đó vẫn còn |
| Bí mật | `.env` bị ignore, lịch sử git không chứa `.env`, `.env.example` chỉ có `change_me` |

## Bài học
- "Container đang chạy" khác "dịch vụ sẵn sàng": cần healthcheck + `service_healthy` để thứ tự khởi động đúng.
- Trong network của Compose, dùng tên service làm host, không dùng `localhost`.
- Health endpoint nên trả mã HTTP phản ánh trạng thái (503), không chỉ ghi chữ trong body.
- Tách cấu hình khỏi code: mật khẩu nằm ở `.env` (ignore), repo chỉ giữ `.env.example`.

## Tách 3 môi trường: dev, stg, prod
Dùng một file **base** dùng chung và mỗi môi trường một file **override**; Compose gộp các file theo thứ tự `-f`.

| File | Vai trò |
|---|---|
| [docker-compose.yml](../docker-compose.yml) | Base: `db` (MySQL + healthcheck + volume), `api` (depends_on healthy, `DATABASE_URL`, healthcheck gọi `/health`). Không có port, không có `container_name` |
| [docker-compose.dev.yml](../docker-compose.dev.yml) | `name: teamboard-dev`, build local, mở cổng DB (3306) và API (8080), `restart: "no"` |
| [docker-compose.stg.yml](../docker-compose.stg.yml) | `name: teamboard-stg`, giống prod (build local hoặc kéo image), **không mở cổng DB**, API cổng 8081, `restart: unless-stopped` |
| [docker-compose.prod.yml](../docker-compose.prod.yml) | `name: teamboard-prod`, **chỉ chạy image có version** (`API_IMAGE` bắt buộc, không build trên server), không mở cổng DB, `restart: always`, giới hạn RAM, xoay vòng log |

Điểm mấu chốt:
- **`name:`** khác nhau nên mỗi môi trường có container, network và **volume riêng** (`teamboard-dev_mysql_data`, `-stg_`, `-prod_`): dữ liệu không lẫn nhau, và có thể chạy cả 3 cùng lúc.
- **Bỏ `container_name`** khỏi base, vì tên cố định sẽ đụng nhau giữa các môi trường.
- **Env file riêng** (`.env.dev`, `.env.stg`, `.env.prod`) chứa mật khẩu/cổng, đều nằm trong `.gitignore`; repo chỉ commit `.env.*.example`. Prod nên dùng mật khẩu dài, ngẫu nhiên.
- Prod/stg không publish cổng DB: chỉ `api` trong network nội bộ truy cập được `db`.
- Prod dùng image build sẵn (từ CI) để chạy đúng thứ đã test ở stg, thay vì build lại trên server.

Lệnh (đã có npm script):
```bash
cp .env.dev.example .env.dev            # tương tự cho stg, prod; sửa mật khẩu
npm run docker:dev:up                   # = docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml up -d --build
npm run docker:stg:up
npm run docker:prod:up                  # cần API_IMAGE trỏ tới image đã build/push
npm run docker:dev:down                 # dừng, giữ dữ liệu
```
Kiểm tra (2026-10-21): chạy đồng thời cả 3 môi trường, cả 6 container healthy, `/health` trả Healthy ở 8080/8081/8082, 3 volume riêng; DB chỉ mở cổng host ở dev.
