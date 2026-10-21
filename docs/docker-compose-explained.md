# Docker Compose giải thích từ đầu

Tài liệu này giải thích **Docker Compose là gì** và đọc **từng dòng** của [docker-compose.yml](../docker-compose.yml) trong repo. Phần triển khai và kết quả kiểm tra nằm ở [docker-compose.md](docker-compose.md).

## 1. Docker Compose là gì, để làm gì
`docker run` chạy **một** container. Một ứng dụng thực tế cần nhiều thứ (API + DB + ...), mỗi thứ phải gõ một lệnh dài với nhiều cờ (`-p`, `-e`, `-v`, `--network`...). Compose cho phép:
- Mô tả **cả hệ thống** trong một file YAML (khai báo, không phải gõ lệnh).
- Dựng/dừng/xoá tất cả bằng một lệnh.
- Tự tạo một **network riêng**, các service gọi nhau bằng tên.

Hình dung: Dockerfile = công thức làm **một** image; docker-compose.yml = kịch bản chạy **nhiều** container cùng nhau.

## 2. Các khái niệm chính
| Khái niệm | Ý nghĩa |
|---|---|
| **Service** | Một thành phần của hệ thống (`api`, `db`). Từ service Compose tạo ra 1 hoặc nhiều container. |
| **Container** | Tiến trình đang chạy từ image. Tên container (`teamboard-mysql`) khác tên service (`db`). |
| **Network** | Compose tự tạo `teamboard-api_default`; mọi service nằm trong đó và phân giải tên service thành IP. |
| **Volume** | Nơi lưu dữ liệu bền vững ngoài vòng đời container. |
| **Project** | Một lần chạy Compose; tên mặc định = tên thư mục (`teamboard-api`), làm tiền tố cho network/volume. |

## 3. Đọc từng dòng file của repo

```yaml
services:
```
Khối gốc, liệt kê các service. Ngoài ra còn `volumes:` (khai báo volume) và `networks:` (không dùng ở đây).

### Service `db`
```yaml
  db:                                   # tên service; service khác gọi DB bằng host "db"
    image: mysql:8.4                    # dùng image có sẵn từ Docker Hub, tag 8.4 (cố định phiên bản)
    container_name: teamboard-mysql     # đặt tên container (không bắt buộc; bỏ đi thì Compose tự đặt)
    restart: unless-stopped             # tự chạy lại khi lỗi/khởi động lại máy, trừ khi bạn tự stop
    environment:                        # biến môi trường truyền vào container
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?set MYSQL_ROOT_PASSWORD in .env}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-teamboard}
```
- Image MySQL đọc `MYSQL_ROOT_PASSWORD` để đặt mật khẩu root và `MYSQL_DATABASE` để tạo sẵn database lúc khởi tạo.
- Cú pháp nội suy biến (lấy từ file `.env` hoặc shell):
  | Cú pháp | Hành vi |
  |---|---|
  | `${VAR}` | lấy giá trị, rỗng nếu thiếu |
  | `${VAR:-abc}` | thiếu hoặc rỗng thì dùng `abc` |
  | `${VAR:?thông báo}` | thiếu thì **báo lỗi và dừng** |

```yaml
    ports:
      - "3306:3306"                     # cổng_máy_host : cổng_trong_container
```
Mở cổng ra máy host để dùng Prisma Studio/`npm run dev`/client SQL. Container khác trong network **không cần** mục này vẫn gọi được `db:3306`.

```yaml
    volumes:
      - mysql_data:/var/lib/mysql       # tên_volume : đường_dẫn_trong_container
```
Gắn volume vào thư mục dữ liệu của MySQL. (Nếu bên trái là đường dẫn như `./data` thì gọi là *bind mount*, nối thẳng thư mục máy host.)

```yaml
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -uroot -p$$MYSQL_ROOT_PASSWORD --silent"]
      interval: 5s        # cứ 5 giây chạy test một lần
      timeout: 5s         # test quá 5 giây tính là thất bại
      retries: 20         # thất bại liên tiếp 20 lần mới coi là unhealthy
      start_period: 20s   # 20 giây đầu thất bại chưa bị tính
```
Trạng thái container: `starting` -> `healthy` hoặc `unhealthy`. Xem bằng `docker compose ps`. `$$` = ký tự `$` thật (Compose không nội suy), để shell **trong container** đọc biến.

### Service `api`
```yaml
  api:
    build: .                            # dựng image từ Dockerfile ở thư mục hiện tại (thay vì `image:`)
    container_name: teamboard-api
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy      # đợi db healthy mới khởi động api
```
Dạng ngắn `depends_on: [db]` chỉ đảm bảo thứ tự **start**, không đảm bảo DB đã sẵn sàng. `condition` có 3 giá trị: `service_started`, `service_healthy`, `service_completed_successfully`.

```yaml
    environment:
      DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD}@db:3306/${MYSQL_DATABASE:-teamboard}
      PORT: 8080
    ports:
      - "${API_PORT:-8080}:8080"
```
- `DATABASE_URL` có dạng `mysql://user:password@host:port/database`; host là `db`.
- `PORT: 8080` là cổng app lắng nghe **trong** container; `ports` đưa nó ra máy host ở `API_PORT` (mặc định 8080).

```yaml
volumes:
  mysql_data:
```
Khai báo volume để Compose tạo và quản lý. Bỏ trống phần cấu hình = dùng driver mặc định (lưu trên đĩa của Docker).

## 4. Luồng khi chạy `docker compose up -d --build`
1. Đọc `docker-compose.yml` và `.env`, thay biến.
2. Build image `api` từ Dockerfile (`--build`).
3. Tạo network và volume nếu chưa có.
4. Start `db`, đợi healthcheck -> `healthy`.
5. Start `api`: `prisma migrate deploy` tạo bảng, rồi chạy server.
6. `-d` = chạy nền, trả lại terminal.

## 5. Lệnh hay dùng
| Lệnh | Tác dụng |
|---|---|
| `docker compose up -d` | tạo + chạy tất cả ở nền |
| `docker compose up -d --build` | build lại image rồi chạy (dùng khi đổi code) |
| `docker compose ps` | trạng thái các service (có cột healthy) |
| `docker compose logs -f api` | xem log thời gian thực của `api` |
| `docker compose stop db` / `start db` | dừng / chạy lại một service |
| `docker compose restart api` | khởi động lại |
| `docker compose exec db mysql -uroot -p` | mở shell/lệnh trong container đang chạy |
| `docker compose config` | in file sau khi thay biến (tìm lỗi cấu hình, **sẽ lộ mật khẩu** nên đừng dán lên mạng) |
| `docker compose down` | xoá container + network, **giữ volume** |
| `docker compose down -v` | xoá cả volume, **mất dữ liệu** |

`stop` chỉ dừng container (còn tồn tại); `down` xoá hẳn container.

## 6. Lỗi thường gặp
| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| `set MYSQL_ROOT_PASSWORD in .env` | Chưa có `.env`: `cp .env.example .env` |
| `port is already allocated` | Cổng 3306/8080 bị chiếm (MySQL cài sẵn trên máy?). Đổi `API_PORT` hoặc đổi vế trái của `ports` |
| API không kết nối được DB | Dùng `localhost` thay vì `db` trong `DATABASE_URL`; hoặc mật khẩu có ký tự đặc biệt chưa URL-encode |
| `Access denied` sau khi đổi mật khẩu | Volume cũ giữ mật khẩu cũ. `docker compose down -v` (mất dữ liệu) hoặc đổi bằng SQL |
| Sửa code mà container vẫn chạy bản cũ | Quên `--build` |
| `api` bị `Restarting` | `docker compose logs api` xem lỗi (thường là migration hoặc kết nối DB) |
