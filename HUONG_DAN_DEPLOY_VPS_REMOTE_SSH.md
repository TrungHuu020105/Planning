# Hướng Dẫn Deploy Planner App Lên VPS (Remote SSH + GitHub)

Tài liệu này hướng dẫn deploy dự án bằng:
- VS Code extension `Remote - SSH`
- Lấy source trực tiếp từ GitHub trên VPS
- Chạy bằng Docker Compose

## 1) Yêu Cầu VPS

- Ubuntu 22.04+ (khuyến nghị)
- Mở port inbound:
  - `22` (SSH)
  - `2005` (frontend)
  - `8001` (backend API)
- Có repository GitHub chứa source dự án

## 2) Cài Docker Trên VPS

Chạy trên VPS:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Sau đó đăng xuất/đăng nhập lại VPS để nhận quyền `docker` group.

Kiểm tra:

```bash
docker --version
docker compose version
```

## 3) Kết Nối VPS Bằng VS Code Remote SSH

1. Cài extension `Remote - SSH` trong VS Code.
2. Nhấn `Ctrl+Shift+P` -> `Remote-SSH: Add New SSH Host...`
3. Nhập:
   - `ssh <username>@<vps-ip>`
4. Kết nối:
   - `Remote-SSH: Connect to Host...`

## 4) Pull Source Từ GitHub Trên VPS

Mở terminal trong VS Code (đang kết nối VPS), chạy:

```bash
cd ~
git clone <url-repo-github-cua-ban> Planning
cd Planning
```

Nếu repo private, bạn cần cấu hình SSH key hoặc token GitHub trước.

## 5) Chạy Dự Án Bằng Docker Compose

Tại thư mục gốc dự án trên VPS:

```bash
docker compose up -d --build
```

Kiểm tra:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

Truy cập:
- Frontend: `http://<vps-ip>:2005`
- Backend API: `http://<vps-ip>:8001`

## 6) Cập Nhật Khi Có Code Mới

```bash
cd ~/Planning
git pull
docker compose up -d --build
```

## 7) Các Lệnh Thường Dùng

Dừng toàn bộ:

```bash
docker compose down
```

Khởi động lại:

```bash
docker compose restart
```

Build lại riêng frontend:

```bash
docker compose up -d --build frontend
```

Build lại riêng backend:

```bash
docker compose up -d --build backend
```

## 8) Xử Lý Lỗi Thường Gặp

### Lỗi CORS (`OPTIONS ... 400`)
- Kiểm tra backend `allow_origins` đã có:
  - `http://<vps-ip>:2005`
  - domain thật của bạn (nếu dùng domain)

### Không vào được web
- Kiểm tra firewall/security group đã mở port `2005`.
- Kiểm tra container có chạy không: `docker compose ps`.

### Lỗi permission Docker
- Đăng nhập lại sau khi chạy:
  - `sudo usermod -aG docker $USER`

### Lỗi build frontend do Node version
- Nếu package yêu cầu Node mới hơn, dùng Node 22 trong `frontend/Dockerfile`.

## 9) Gợi Ý Cho Môi Trường Production

- Dùng Nginx reverse proxy.
- Cấu hình HTTPS bằng Let's Encrypt.
- Không public backend `8001` nếu không cần.
- Backup định kỳ file DB: `backend/data/planner.db`.
