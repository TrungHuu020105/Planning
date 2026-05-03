# FastAPI Backend

## Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API

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
