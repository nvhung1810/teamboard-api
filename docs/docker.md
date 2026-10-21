# Docker hóa TeamBoard API

## Khái niệm (giải thích bằng lời của mình)
- **Image**: gói đóng gói chỉ đọc, chứa code ứng dụng, Node runtime và toàn bộ dependency. Đây là bản mẫu để tạo container.
- **Container**: một tiến trình đang chạy được tạo từ image, có thêm một lớp ghi mỏng ở trên cùng. Nhiều container có thể dùng chung một image.
- **Layer**: mỗi lệnh trong Dockerfile tạo ra một layer. Layer được cache và chia sẻ; nếu lệnh và dữ liệu đầu vào không đổi thì Docker dùng lại layer cũ (hiện `CACHED`).
- **Registry**: máy chủ lưu trữ và phân phối image (Docker Hub, GHCR). `docker push/pull` dùng để đẩy lên và kéo về.

## Đã làm gì
Bài tập viết cho .NET, còn repo này là Node/TypeScript nên dùng các thành phần tương đương:

| Bài tập (.NET) | Repo này |
|---|---|
| Stage build `dotnet/sdk` | Stage build `node:22-slim` (có dev deps, `tsc`, `prisma generate`) |
| Stage runtime `dotnet/aspnet` | `node:22-slim` chỉ chứa `dist/`, `node_modules` prod, `prisma/` |
| `.csproj` + `dotnet restore` | `package.json` + `package-lock.json` + `npm ci` |
| `bin/`, `obj/` | `node_modules/`, `dist/` |

File: [Dockerfile](../Dockerfile), [.dockerignore](../.dockerignore).

Các quyết định thiết kế:
1. **Hai stage**: stage build giữ TypeScript và các dev dependency. Stage runtime chỉ copy phần output (`npm prune --omit=dev` loại dev deps trước khi copy).
2. **Thứ tự thân thiện với cache**: copy manifest + `prisma/` và chạy `npm ci` *trước* khi copy `src/`, nên sửa file `.ts` không phải cài lại dependency.
3. **`.dockerignore`** loại `node_modules`, `dist`, `.git`, `.env`: tránh lộ secret vào image, giảm build context, và tránh `node_modules` của máy host ghi đè bản trong container.
4. **Không chạy root**: stage runtime kết thúc bằng `USER node`.
5. **Cài openssl** vì Prisma engine cần nó trên Debian slim.
6. **Cấu hình lúc chạy**: `.env` không nằm trong image; truyền `-e DATABASE_URL=...`. `PORT=8080` được đặt mặc định (server.ts đọc `process.env.PORT`).
7. App vẫn khởi động khi không có DB (Prisma kết nối lazy), chỉ các endpoint cần DB mới lỗi.

## Cách kiểm tra
```bash
docker build -t teamboard-api .
docker run --rm -p 8080:8080 teamboard-api            # mở http://localhost:8080/api-docs
docker run --rm -p 8080:8080 -e DATABASE_URL="mysql://USER:PASS@host.docker.internal:3306/teamboard" teamboard-api

# Kiểm tra cache: sửa 1 file source, build lại, bước `npm ci` phải hiện CACHED
echo "// touch" >> src/main/server.ts && docker build -t teamboard-api . ; git checkout src/main/server.ts

# Kiểm tra non-root
docker run --rm teamboard-api id
```

## Môi trường
MacBook Air M4 (arm64), Colima (`colima start --vm-type vz --cpu 2 --memory 4`), Docker 29.9.2, buildx 0.38. Đo ngày 2026-10-21. Lưu ý: dùng builder cũ thì không in `CACHED` (in `Using cache`), nên cần cài `docker-buildx` (`brew install docker-buildx`).

## Log kích thước image
```bash
docker build --target build   -t teamboard-api:build .
docker build --target runtime -t teamboard-api:runtime .
docker images
```

| Image | Kích thước |
|---|---|
| `node:22-slim` (base) | 349 MB |
| `teamboard-api:build` (tương đương SDK) | 1.06 GB |
| `teamboard-api:runtime` (= `teamboard-api:latest`) | 746 MB |
| `teamboard-api:alpine` (nâng cao, runtime) | 634 MB |

Nhận xét:
- Runtime nhỏ hơn build khoảng **314 MB (~30%)** nhờ bỏ source, cache npm và công cụ build. Chênh lệch không lớn bằng .NET vì Node không có "SDK nặng" tách khỏi runtime; hai stage dùng chung base.
- Runtime vẫn 746 MB, trong đó ~397 MB là `/app`: `@prisma` (110 MB), `prisma` CLI (66 MB), `effect` (34 MB), `typescript` (23 MB)... Chúng được kéo vào dưới dạng dependency/peer dependency của `@prisma/client` nên `npm prune --omit=dev` không bỏ được. Có thể giảm thêm nếu cắt thủ công, nhưng chưa làm để giữ Dockerfile đơn giản.
- Alpine nhỏ hơn slim khoảng **112 MB** (746 -> 634 MB).

## Kết quả kiểm tra
- `docker build -t teamboard-api .` thành công.
- `docker run -p 8080:8080 teamboard-api`: log `Server running at http://localhost:8080`; `GET /api-docs/` trả **200**; `GET /api/boards` trả **500** `Internal server error` (không có DB, đúng như dự kiến).
- Non-root: `docker exec ... id -u` trả `1000` (user `node`).
- Cache: thêm 1 dòng comment vào `src/main/server.ts` rồi build lại:

| Bước | Kết quả |
|---|---|
| `COPY package.json package-lock.json` | CACHED |
| `COPY prisma` | CACHED |
| `RUN npm ci` (restore) | **CACHED** |
| `COPY tsconfig.json` | CACHED |
| `COPY src` | chạy lại |
| `prisma generate && npm run build && npm prune` | chạy lại |

- Alpine (thử trên bản sao tạm, không đưa vào repo): đổi base sang `node:22-alpine`, `apk add openssl`, thêm `binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x"]` vào `schema.prisma`. Chạy được, `/api-docs/` 200, `/api/boards` 500 (không DB). Trên AWS x86_64 cần target `linux-musl-openssl-3.0.x`.

## Nhật ký thực hiện (các lệnh đã chạy)
1. **Cài công cụ** (Mac M4, chọn Colima vì nhẹ hơn Docker Desktop):
   ```bash
   brew install colima docker
   colima start --vm-type vz --cpu 2 --memory 4
   docker run --rm hello-world            # xác nhận daemon hoạt động
   ```
2. **Build 3 image** (build stage, runtime stage, đầy đủ) rồi đo bằng `docker images`.
3. **Chạy container**, kiểm tra `/api-docs/` (200) và `/api/boards` (500 do không có DB), `docker exec ... id -u` (1000).
4. **Kiểm tra cache lần 1**: build bằng builder cũ không in `CACHED`, nên `brew install docker-buildx` và liên kết plugin:
   ```bash
   brew install docker-buildx
   mkdir -p ~/.docker/cli-plugins
   ln -sfn /opt/homebrew/opt/docker-buildx/bin/docker-buildx ~/.docker/cli-plugins/docker-buildx
   ```
5. **Kiểm tra cache lần 2**: build lại với đúng nội dung đã sửa ở lần trước nên *mọi* bước đều CACHED, không chứng minh được gì. Sửa lại bằng comment có timestamp (`echo "// touch $(date +%s)" >> src/main/server.ts`) rồi `git checkout src/main/server.ts` sau khi build; kết quả như bảng ở trên.
6. **Thử alpine** trên bản sao tạm (ngoài repo). Lần đầu lỗi do lệnh `sed` làm hỏng dấu `\` nối dòng ở `apk add`, sửa lại rồi build thành công (634 MB).
7. **Dừng Docker** khi xong: `colima stop` (giải phóng RAM). Khi cần dùng lại: `colima start --vm-type vz --cpu 2 --memory 4`.

## Bài học
- Cache phụ thuộc thứ tự lệnh: copy manifest trước, source sau.
- Muốn thấy `CACHED` cần BuildKit/buildx; phải thay đổi *nội dung mới* thì mới kiểm chứng được cache hoạt động đúng.
- Image build trên Mac M4 là arm64; deploy lên máy x86_64 cần `--platform linux/amd64` (hoặc dùng Graviton), và Alpine cần `binaryTargets` đúng kiến trúc.
- Image và container vẫn còn trong VM của Colima; dọn bằng `docker system prune` khi cần.

## Trạng thái
- [x] Dockerfile, .dockerignore
- [x] Build, chạy, kiểm tra cache, non-root
- [x] Log kích thước (slim, build, alpine)
- [x] Đã dừng Colima
