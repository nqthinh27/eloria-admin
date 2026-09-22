# syntax=docker/dockerfile:1
#
# Image build ở máy LOCAL rồi push lên registry; `docker-compose.yml` ở server chỉ `pull`.
# Vì vậy image phải "trung tính" với môi trường: mọi giá trị đổi theo môi trường đều đọc LÚC CHẠY
# (xem docker/30-eloria-runtime-config.sh + src/config/runtime-env.ts), không nướng vào bundle.
#
#   docker build -t <registry>/eloria-admin:<tag> .
#   docker push  <registry>/eloria-admin:<tag>

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — build
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Cài dependency trước để tận dụng cache layer khi chỉ đổi source.
COPY package.json package-lock.json ./
RUN npm ci

# Tham số BUILD-TIME duy nhất: base path khi deploy vào thư mục con (vd "/admin/").
# Không thể chuyển sang lúc chạy vì Vite ghi đường dẫn asset thẳng vào index.html.
ARG VITE_BASE_URL="/"

COPY . .

# `vite.config.ts` lấy `base` qua `loadEnv()` — hàm này CHỈ đọc file .env*, không đọc biến môi
# trường của process. Vì vậy phải ghi ARG ra `.env.production` thì `--build-arg` mới có tác dụng
# (mode của `vite build` là "production").
RUN echo "VITE_BASE_URL=$VITE_BASE_URL" > .env.production

# `.env` bị .dockerignore loại bỏ ⇒ các VITE_* khác đều undefined lúc build, bundle rơi về giá trị
# mặc định trong code và sẽ bị config.js ghi đè lúc chạy. Đúng ý đồ: một image dùng cho mọi môi trường.
# Lệnh build = `tsc -b && vite build` (CLAUDE.md mục Lệnh) ⇒ lỗi type làm fail image.
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — serve
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS serve

# Conf MẶC ĐỊNH, chỉ để image chạy được ngay sau khi build. Cấu hình thật cho từng môi trường
# thì bind-mount đè lên đúng đường dẫn này (xem khối `volumes` trong docker-compose.yml)
# — không phải build lại image.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx:alpine tự chạy mọi script trong /docker-entrypoint.d/ lúc khởi động ⇒ config.js được
# sinh lại từ `environment` của compose mỗi lần tạo container. Cơ chế này ĐỘC LẬP với conf
# nginx, nên vẫn chạy bình thường khi conf bị mount đè.
COPY docker/30-eloria-runtime-config.sh /docker-entrypoint.d/30-eloria-runtime-config.sh
# Bit thực thi không chắc sống sót qua Windows/git ⇒ set lại trong image.
RUN chmod +x /docker-entrypoint.d/30-eloria-runtime-config.sh

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
