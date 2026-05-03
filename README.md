# Weekly Planner

Ung dung quan ly cong viec tuan:
- Backend: FastAPI + SQLite
- Frontend: React + Vite + TypeScript

## Cau truc thu muc

- `backend/`: API, auth, luu du lieu SQLite, dispatcher thong bao Telegram
- `frontend/`: giao dien planner, login/register, admin panel, cai dat thong bao

## Chay du an

### 1) Chay backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend mac dinh: `http://localhost:8000`

### 2) Chay frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mac dinh: `http://localhost:5173`

Neu can doi API URL, tao file `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Tai khoan va phan quyen

- `admin`: chi co quyen quan ly user (xoa user, reset password), khong duoc dung planner
- `user`: duoc dung planner va cai dat thong bao

Tai khoan admin mac dinh duoc tao trong backend:
- Username: `Trunghuu`
- Password: `Trunghuu123`

## Tinh nang chinh

- Dang ky: `username`, `password`, `full_name`
- Dang nhap/dang xuat theo token Bearer
- Quan ly task/habit/goal theo tung user
- Thong bao Telegram:
  - Bam nut `Thong bao` tren header (UI user)
  - Nhap `Ten thong bao`, `Telegram Bot Token`, `Telegram Chat ID`
  - Bam `Add` de luu
  - Bam `Quet` de tao lich nhac cho cac task chua hoan thanh
  - He thong gui truoc 5 phut
  - Co the `Xoa` de xoa cau hinh da luu

## API tong quan

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Planner (user only)

- `GET /api/state`
- `POST /api/tasks`
- `PATCH /api/tasks/{task_id}/toggle`
- `PATCH /api/tasks/{task_id}`
- `DELETE /api/tasks/{task_id}`
- `POST /api/habits`
- `PATCH /api/habits/{habit_id}/toggle`
- `DELETE /api/habits/{habit_id}`
- `POST /api/goals`
- `PATCH /api/goals/{goal_id}/toggle`
- `DELETE /api/goals/{goal_id}`
- `PATCH /api/user`

### Notifications (user only)

- `GET /api/notifications/settings`
- `PUT /api/notifications/settings`
- `DELETE /api/notifications/settings`
- `POST /api/notifications/scan`

### Admin only

- `GET /api/admin/users`
- `DELETE /api/admin/users/{user_id}`
- `PATCH /api/admin/users/{user_id}/reset-password`

## Luu y

- Du lieu SQLite: `backend/data/planner.db`
- File `backend/.env` hien khong bat buoc cho Telegram (token/chat id luu theo user trong DB).
