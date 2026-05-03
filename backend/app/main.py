from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .notifier import start_notification_dispatcher
from .models import (
    AddNamePayload,
    AddTaskPayload,
    AdminUser,
    AuthResponse,
    AuthUser,
    ChangePasswordPayload,
    LoginPayload,
    PlannerState,
    RegisterPayload,
    NotificationScanResponse,
    NotificationSettingsPayload,
    NotificationSettingsResponse,
    ResetPasswordPayload,
    SetUserPayload,
    ToggleHabitPayload,
    UpdateTaskPayload,
)
from .store import (
    change_password,
    create_reminder_jobs,
    create_user,
    delete_notification_settings,
    delete_user,
    get_notification_settings,
    get_user_by_token,
    init_db,
    list_users,
    load_state,
    login,
    logout,
    reset_password,
    save_state,
    upsert_notification_settings,
)

app = FastAPI(title="Weekly Planner API")
init_db()
start_notification_dispatcher()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://172.25.48.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _extract_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    return authorization[7:].strip()


def require_user(authorization: str | None = Header(default=None)) -> dict:
    token = _extract_token(authorization)
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def require_admin(user: dict = Depends(require_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def require_planner_user(user: dict = Depends(require_user)) -> dict:
    if user["role"] == "admin":
        raise HTTPException(status_code=403, detail="Admin account does not have planner access")
    return user


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register", response_model=AuthResponse)
def register(payload: RegisterPayload) -> AuthResponse:
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if len(payload.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if not payload.full_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required")
    try:
        create_user(
            username=payload.username.strip(),
            password=payload.password,
            full_name=payload.full_name.strip(),
        )
    except ValueError as ex:
        raise HTTPException(status_code=409, detail=str(ex)) from ex
    auth = login(payload.username.strip(), payload.password)
    if not auth:
        raise HTTPException(status_code=500, detail="Unable to login after register")
    return AuthResponse(**auth)


@app.post("/api/auth/login", response_model=AuthResponse)
def login_api(payload: LoginPayload) -> AuthResponse:
    auth = login(payload.username.strip(), payload.password)
    if not auth:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return AuthResponse(**auth)


@app.get("/api/auth/me", response_model=AuthUser)
def me(user: dict = Depends(require_user)) -> AuthUser:
    return AuthUser(**user)


@app.post("/api/auth/logout")
def logout_api(authorization: str | None = Header(default=None)) -> dict[str, str]:
    token = _extract_token(authorization)
    logout(token)
    return {"status": "ok"}


@app.patch("/api/auth/change-password")
def change_password_api(
    payload: ChangePasswordPayload,
    user: dict = Depends(require_user),
) -> dict[str, str]:
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if payload.old_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from old password")
    ok = change_password(
        user_id=user["id"],
        old_password=payload.old_password,
        new_password=payload.new_password,
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    return {"status": "ok"}


@app.get("/api/admin/users", response_model=list[AdminUser])
def admin_users(_: dict = Depends(require_admin)) -> list[AdminUser]:
    return [AdminUser(**x) for x in list_users()]


@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, admin: dict = Depends(require_admin)) -> dict[str, str]:
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Admin cannot delete self")
    delete_user(user_id)
    return {"status": "ok"}


@app.patch("/api/admin/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    payload: ResetPasswordPayload,
    admin: dict = Depends(require_admin),
) -> dict[str, str]:
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Admin cannot reset own password here")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    reset_password(user_id, payload.new_password)
    return {"status": "ok"}


@app.get("/api/state", response_model=PlannerState)
def get_state(user: dict = Depends(require_planner_user)) -> PlannerState:
    return load_state(user["id"], user["full_name"])


@app.post("/api/tasks", response_model=PlannerState)
def add_task(payload: AddTaskPayload, user: dict = Depends(require_planner_user)) -> PlannerState:
    state = load_state(user["id"], user["full_name"])
    task = payload.model_dump()
    task["id"] = uuid4().hex[:8]
    task["done"] = False
    state.tasks.append(task)
    save_state(user["id"], state)
    return load_state(user["id"], state.user)


@app.patch("/api/tasks/{task_id}/toggle", response_model=PlannerState)
def toggle_task(task_id: str, user: dict = Depends(require_planner_user)) -> PlannerState:
    state = load_state(user["id"], user["full_name"])
    task = next((x for x in state.tasks if x.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.done = not task.done
    save_state(user["id"], state)
    return load_state(user["id"], state.user)


@app.patch("/api/tasks/{task_id}", response_model=PlannerState)
def update_task(
    task_id: str, payload: UpdateTaskPayload, user: dict = Depends(require_planner_user)
) -> PlannerState:
    state = load_state(user["id"], user["full_name"])
    task = next((x for x in state.tasks if x.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    patch = payload.model_dump(exclude_none=True)
    for key, value in patch.items():
        setattr(task, key, value)
    save_state(user["id"], state)
    return load_state(user["id"], state.user)


@app.delete("/api/tasks/{task_id}", response_model=PlannerState)
def delete_task(task_id: str, user: dict = Depends(require_planner_user)) -> PlannerState:
    state = load_state(user["id"], user["full_name"])
    state.tasks = [x for x in state.tasks if x.id != task_id]
    save_state(user["id"], state)
    return load_state(user["id"], state.user)


@app.post("/api/habits", response_model=PlannerState)
def add_habit(payload: AddNamePayload, user: dict = Depends(require_planner_user)) -> PlannerState:
    state = load_state(user["id"], user["full_name"])
    state.habits.append({"id": uuid4().hex[:8], "name": payload.name, "done": {}})
    save_state(user["id"], state)
    return load_state(user["id"], state.user)


@app.patch("/api/habits/{habit_id}/toggle", response_model=PlannerState)
def toggle_habit(
    habit_id: str, payload: ToggleHabitPayload, user: dict = Depends(require_planner_user)
) -> PlannerState:
    state = load_state(user["id"], user["full_name"])
    habit = next((x for x in state.habits if x.id == habit_id), None)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    current = bool(habit.done.get(payload.date))
    habit.done[payload.date] = not current
    save_state(user["id"], state)
    return load_state(user["id"], state.user)


@app.delete("/api/habits/{habit_id}", response_model=PlannerState)
def delete_habit(habit_id: str, user: dict = Depends(require_planner_user)) -> PlannerState:
    state = load_state(user["id"], user["full_name"])
    state.habits = [x for x in state.habits if x.id != habit_id]
    save_state(user["id"], state)
    return load_state(user["id"], state.user)


@app.post("/api/goals", response_model=PlannerState)
def add_goal(payload: AddNamePayload, user: dict = Depends(require_planner_user)) -> PlannerState:
    state = load_state(user["id"], user["full_name"])
    state.goals.append({"id": uuid4().hex[:8], "name": payload.name, "done": False})
    save_state(user["id"], state)
    return load_state(user["id"], state.user)


@app.patch("/api/goals/{goal_id}/toggle", response_model=PlannerState)
def toggle_goal(goal_id: str, user: dict = Depends(require_planner_user)) -> PlannerState:
    state = load_state(user["id"], user["full_name"])
    goal = next((x for x in state.goals if x.id == goal_id), None)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.done = not goal.done
    save_state(user["id"], state)
    return load_state(user["id"], state.user)


@app.delete("/api/goals/{goal_id}", response_model=PlannerState)
def delete_goal(goal_id: str, user: dict = Depends(require_planner_user)) -> PlannerState:
    state = load_state(user["id"], user["full_name"])
    state.goals = [x for x in state.goals if x.id != goal_id]
    save_state(user["id"], state)
    return load_state(user["id"], state.user)


@app.patch("/api/user", response_model=PlannerState)
def set_user(payload: SetUserPayload, user: dict = Depends(require_planner_user)) -> PlannerState:
    state = load_state(user["id"], user["full_name"])
    state.user = payload.user
    save_state(user["id"], state)
    return load_state(user["id"], state.user)


@app.get("/api/notifications/settings", response_model=NotificationSettingsResponse)
def get_notification_settings_api(
    user: dict = Depends(require_planner_user),
) -> NotificationSettingsResponse:
    settings = get_notification_settings(user["id"])
    return NotificationSettingsResponse(**settings)


@app.put("/api/notifications/settings", response_model=NotificationSettingsResponse)
def set_notification_settings_api(
    payload: NotificationSettingsPayload,
    user: dict = Depends(require_planner_user),
) -> NotificationSettingsResponse:
    upsert_notification_settings(
        user_id=user["id"],
        enabled=payload.enabled,
        provider=payload.provider.strip() or "telegram",
        notification_name=payload.notification_name.strip(),
        telegram_token=payload.telegram_token.strip(),
        telegram_chat_id=payload.telegram_chat_id.strip(),
    )
    settings = get_notification_settings(user["id"])
    return NotificationSettingsResponse(**settings)


@app.post("/api/notifications/scan", response_model=NotificationScanResponse)
def scan_notifications_api(
    user: dict = Depends(require_planner_user),
) -> NotificationScanResponse:
    settings = get_notification_settings(user["id"])
    if not settings["enabled"]:
        raise HTTPException(status_code=400, detail="Thong bao dang tat")
    if not settings["telegram_token"] or not settings["telegram_chat_id"]:
        raise HTTPException(status_code=400, detail="Thieu token hoac chat id Telegram")
    created = create_reminder_jobs(user["id"], lead_minutes=5)
    return NotificationScanResponse(created=created)


@app.delete("/api/notifications/settings", response_model=NotificationSettingsResponse)
def delete_notification_settings_api(
    user: dict = Depends(require_planner_user),
) -> NotificationSettingsResponse:
    delete_notification_settings(user["id"])
    return NotificationSettingsResponse(
        enabled=False,
        provider="telegram",
        notification_name="",
        telegram_token="",
        telegram_chat_id="",
    )
