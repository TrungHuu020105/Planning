from typing import Dict, List, Literal

from pydantic import BaseModel


Category = Literal["Learn", "Chores", "Exercise", "Work", "Study", "Personal"]


class Task(BaseModel):
    id: str
    date: str
    title: str
    category: Category
    start: str
    end: str
    done: bool


class Habit(BaseModel):
    id: str
    name: str
    done: Dict[str, bool]


class Goal(BaseModel):
    id: str
    name: str
    done: bool


class PlannerState(BaseModel):
    tasks: List[Task]
    habits: List[Habit]
    goals: List[Goal]
    user: str


class AddTaskPayload(BaseModel):
    date: str
    title: str
    category: Category
    start: str
    end: str


class UpdateTaskPayload(BaseModel):
    date: str | None = None
    title: str | None = None
    category: Category | None = None
    start: str | None = None
    end: str | None = None
    done: bool | None = None


class AddNamePayload(BaseModel):
    name: str


class ToggleHabitPayload(BaseModel):
    date: str


class SetUserPayload(BaseModel):
    user: str


class RegisterPayload(BaseModel):
    username: str
    password: str
    full_name: str


class LoginPayload(BaseModel):
    username: str
    password: str


class ResetPasswordPayload(BaseModel):
    new_password: str


class ChangePasswordPayload(BaseModel):
    old_password: str
    new_password: str


class AuthUser(BaseModel):
    id: int
    username: str
    full_name: str
    role: str


class AuthResponse(BaseModel):
    token: str
    user: AuthUser


class AdminUser(BaseModel):
    id: int
    username: str
    full_name: str
    role: str


class NotificationSettingsPayload(BaseModel):
    enabled: bool
    provider: str = "telegram"
    notification_name: str = ""
    telegram_token: str = ""
    telegram_chat_id: str = ""


class NotificationSettingsResponse(BaseModel):
    enabled: bool
    provider: str
    notification_name: str
    telegram_token: str
    telegram_chat_id: str


class NotificationScanResponse(BaseModel):
    created: int
