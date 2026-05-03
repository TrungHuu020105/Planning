import hashlib
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from .models import PlannerState

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DB_FILE = DATA_DIR / "planner.db"
ADMIN_USERNAME = "Trunghuu"
ADMIN_PASSWORD = "Trunghuu123"


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _fmt_date(value: datetime) -> str:
    return value.strftime("%Y-%m-%d")


def _start_of_week(value: datetime) -> datetime:
    return (value - timedelta(days=value.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )


def _connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with closing(_connect()) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin','user'))
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                start TEXT NOT NULL,
                "end" TEXT NOT NULL,
                done INTEGER NOT NULL CHECK(done IN (0, 1)),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS habits (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS habit_logs (
                habit_id TEXT NOT NULL,
                date TEXT NOT NULL,
                done INTEGER NOT NULL CHECK(done IN (0, 1)),
                PRIMARY KEY (habit_id, date),
                FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS goals (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                done INTEGER NOT NULL CHECK(done IN (0, 1)),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS notification_logs (
                task_id TEXT NOT NULL,
                notify_at TEXT NOT NULL,
                PRIMARY KEY (task_id, notify_at),
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS user_notification_settings (
                user_id INTEGER PRIMARY KEY,
                enabled INTEGER NOT NULL CHECK(enabled IN (0, 1)),
                provider TEXT NOT NULL DEFAULT 'telegram',
                notification_name TEXT NOT NULL DEFAULT '',
                telegram_token TEXT NOT NULL DEFAULT '',
                telegram_chat_id TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reminder_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                task_id TEXT NOT NULL,
                send_at TEXT NOT NULL,
                message TEXT NOT NULL,
                sent INTEGER NOT NULL DEFAULT 0 CHECK(sent IN (0, 1)),
                UNIQUE(user_id, task_id, send_at),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );
            """
        )
        cols = [r["name"] for r in conn.execute("PRAGMA table_info(user_notification_settings)").fetchall()]
        if "notification_name" not in cols:
            conn.execute(
                "ALTER TABLE user_notification_settings ADD COLUMN notification_name TEXT NOT NULL DEFAULT ''"
            )
        conn.commit()
        _ensure_admin(conn)


def _ensure_admin(conn: sqlite3.Connection) -> None:
    row = conn.execute(
        "SELECT id FROM users WHERE username = ?", (ADMIN_USERNAME,)
    ).fetchone()
    if row:
        return
    conn.execute(
        "INSERT INTO users(username, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')",
        (ADMIN_USERNAME, hash_password(ADMIN_PASSWORD), ADMIN_USERNAME),
    )
    conn.commit()


def _seed_user_data(conn: sqlite3.Connection, user_id: int) -> None:
    row = conn.execute(
        "SELECT id FROM tasks WHERE user_id = ? LIMIT 1", (user_id,)
    ).fetchone()
    if row:
        return

    start = _start_of_week(datetime.now())
    d = lambda offset: _fmt_date(start + timedelta(days=offset))
    iid = lambda: uuid4().hex[:8]

    tasks = [
        (iid(), user_id, d(0), "Read book", "Learn", "08:00", "09:00", 0),
        (iid(), user_id, d(0), "Learn language", "Study", "19:00", "20:00", 0),
        (iid(), user_id, d(1), "Exercise", "Exercise", "06:30", "07:30", 1),
        (iid(), user_id, d(1), "Study English", "Study", "20:00", "21:00", 0),
        (iid(), user_id, d(2), "Work on project", "Work", "09:00", "12:00", 0),
        (iid(), user_id, d(3), "Review goals", "Personal", "18:00", "19:00", 0),
        (iid(), user_id, d(4), "Clean room", "Chores", "10:00", "11:00", 0),
    ]
    conn.executemany(
        'INSERT INTO tasks(id, user_id, date, title, category, start, "end", done) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        tasks,
    )
    habits = [
        (iid(), user_id, "Read book"),
        (iid(), user_id, "Play instrument"),
        (iid(), user_id, "Learn language"),
        (iid(), user_id, "Pray & read bible"),
    ]
    conn.executemany("INSERT INTO habits(id, user_id, name) VALUES (?, ?, ?)", habits)
    goals = [
        (iid(), user_id, "Create template clone", 0),
        (iid(), user_id, "Find accessories", 0),
    ]
    conn.executemany("INSERT INTO goals(id, user_id, name, done) VALUES (?, ?, ?, ?)", goals)
    conn.commit()


def create_user(username: str, password: str, full_name: str) -> dict:
    with closing(_connect()) as conn:
        init_db()
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()
        if existing:
            raise ValueError("Username already exists")
        cur = conn.execute(
            "INSERT INTO users(username, password_hash, full_name, role) VALUES (?, ?, ?, 'user')",
            (username, hash_password(password), full_name),
        )
        user_id = cur.lastrowid
        conn.commit()
        return {"id": user_id, "username": username, "full_name": full_name, "role": "user"}


def login(username: str, password: str) -> dict | None:
    with closing(_connect()) as conn:
        init_db()
        row = conn.execute(
            "SELECT id, username, full_name, role, password_hash FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if not row or row["password_hash"] != hash_password(password):
            return None
        token = uuid4().hex + uuid4().hex
        conn.execute(
            "INSERT INTO sessions(token, user_id, created_at) VALUES (?, ?, ?)",
            (token, row["id"], datetime.utcnow().isoformat()),
        )
        conn.commit()
        return {
            "token": token,
            "user": {
                "id": row["id"],
                "username": row["username"],
                "full_name": row["full_name"],
                "role": row["role"],
            },
        }


def get_user_by_token(token: str) -> dict | None:
    with closing(_connect()) as conn:
        row = conn.execute(
            """
            SELECT u.id, u.username, u.full_name, u.role
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "username": row["username"],
            "full_name": row["full_name"],
            "role": row["role"],
        }


def logout(token: str) -> None:
    with closing(_connect()) as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()


def list_users() -> list[dict]:
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT id, username, full_name, role FROM users ORDER BY id"
        ).fetchall()
        return [dict(row) for row in rows]


def delete_user(user_id: int) -> None:
    with closing(_connect()) as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()


def reset_password(user_id: int, new_password: str) -> None:
    with closing(_connect()) as conn:
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), user_id),
        )
        conn.commit()


def change_password(user_id: int, old_password: str, new_password: str) -> bool:
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            return False
        if row["password_hash"] != hash_password(old_password):
            return False
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), user_id),
        )
        conn.commit()
        return True


def load_state(user_id: int, full_name: str) -> PlannerState:
    with closing(_connect()) as conn:
        task_rows = conn.execute(
            'SELECT id, date, title, category, start, "end", done FROM tasks WHERE user_id = ? ORDER BY date, start',
            (user_id,),
        ).fetchall()
        tasks = [
            {
                "id": row["id"],
                "date": row["date"],
                "title": row["title"],
                "category": row["category"],
                "start": row["start"],
                "end": row["end"],
                "done": bool(row["done"]),
            }
            for row in task_rows
        ]

        habit_rows = conn.execute(
            "SELECT id, name FROM habits WHERE user_id = ? ORDER BY rowid", (user_id,)
        ).fetchall()
        log_rows = conn.execute(
            """
            SELECT hl.habit_id, hl.date, hl.done
            FROM habit_logs hl
            JOIN habits h ON h.id = hl.habit_id
            WHERE h.user_id = ?
            ORDER BY hl.date
            """,
            (user_id,),
        ).fetchall()
        logs_by_habit: dict[str, dict[str, bool]] = {}
        for row in log_rows:
            logs_by_habit.setdefault(row["habit_id"], {})[row["date"]] = bool(row["done"])
        habits = [
            {"id": row["id"], "name": row["name"], "done": logs_by_habit.get(row["id"], {})}
            for row in habit_rows
        ]

        goal_rows = conn.execute(
            "SELECT id, name, done FROM goals WHERE user_id = ? ORDER BY rowid", (user_id,)
        ).fetchall()
        goals = [
            {"id": row["id"], "name": row["name"], "done": bool(row["done"])}
            for row in goal_rows
        ]
        return PlannerState(tasks=tasks, habits=habits, goals=goals, user=full_name)


def save_state(user_id: int, state: PlannerState) -> None:
    def _value(item, key: str):
        if isinstance(item, dict):
            return item[key]
        return getattr(item, key)

    with closing(_connect()) as conn:
        with conn:
            conn.execute("DELETE FROM tasks WHERE user_id = ?", (user_id,))
            habit_ids = conn.execute(
                "SELECT id FROM habits WHERE user_id = ?", (user_id,)
            ).fetchall()
            for row in habit_ids:
                conn.execute("DELETE FROM habit_logs WHERE habit_id = ?", (row["id"],))
            conn.execute("DELETE FROM habits WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM goals WHERE user_id = ?", (user_id,))
            conn.execute(
                "UPDATE users SET full_name = ? WHERE id = ?", (state.user, user_id)
            )

            conn.executemany(
                'INSERT INTO tasks(id, user_id, date, title, category, start, "end", done) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    (
                        _value(task, "id"),
                        user_id,
                        _value(task, "date"),
                        _value(task, "title"),
                        _value(task, "category"),
                        _value(task, "start"),
                        _value(task, "end"),
                        int(_value(task, "done")),
                    )
                    for task in state.tasks
                ],
            )
            conn.executemany(
                "INSERT INTO habits(id, user_id, name) VALUES (?, ?, ?)",
                [(_value(habit, "id"), user_id, _value(habit, "name")) for habit in state.habits],
            )
            logs = []
            for habit in state.habits:
                done_map = _value(habit, "done")
                for date, done in done_map.items():
                    logs.append((_value(habit, "id"), date, int(done)))
            if logs:
                conn.executemany(
                    "INSERT INTO habit_logs(habit_id, date, done) VALUES (?, ?, ?)", logs
                )
            conn.executemany(
                "INSERT INTO goals(id, user_id, name, done) VALUES (?, ?, ?, ?)",
                [
                    (_value(goal, "id"), user_id, _value(goal, "name"), int(_value(goal, "done")))
                    for goal in state.goals
                ],
            )


def get_due_task_notifications(lead_minutes: int = 5) -> list[dict]:
    now = datetime.now(VN_TZ).replace(second=0, microsecond=0)
    target = now + timedelta(minutes=lead_minutes)
    target_date = target.strftime("%Y-%m-%d")
    target_time = target.strftime("%H:%M")
    notify_at = target.strftime("%Y-%m-%d %H:%M")

    with closing(_connect()) as conn:
        rows = conn.execute(
            """
            SELECT t.id, t.title, t.start, t.date, u.full_name
            FROM tasks t
            JOIN users u ON u.id = t.user_id
            LEFT JOIN notification_logs nl
              ON nl.task_id = t.id AND nl.notify_at = ?
            WHERE t.done = 0
              AND t.date = ?
              AND t.start = ?
              AND u.role = 'user'
              AND nl.task_id IS NULL
            ORDER BY t.start ASC
            """,
            (notify_at, target_date, target_time),
        ).fetchall()
        return [
            {
                "task_id": row["id"],
                "title": row["title"],
                "start": row["start"],
                "date": row["date"],
                "full_name": row["full_name"],
                "notify_at": notify_at,
            }
            for row in rows
        ]


def mark_task_notified(task_id: str, notify_at: str) -> None:
    with closing(_connect()) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO notification_logs(task_id, notify_at) VALUES (?, ?)",
            (task_id, notify_at),
        )
        conn.commit()


def get_notification_settings(user_id: int) -> dict:
    with closing(_connect()) as conn:
        row = conn.execute(
            """
            SELECT enabled, provider, notification_name, telegram_token, telegram_chat_id
            FROM user_notification_settings
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()
        if not row:
            return {
                "enabled": False,
                "provider": "telegram",
                "notification_name": "",
                "telegram_token": "",
                "telegram_chat_id": "",
            }
        return {
            "enabled": bool(row["enabled"]),
            "provider": row["provider"],
            "notification_name": row["notification_name"],
            "telegram_token": row["telegram_token"],
            "telegram_chat_id": row["telegram_chat_id"],
        }


def upsert_notification_settings(
    user_id: int,
    enabled: bool,
    provider: str,
    notification_name: str,
    telegram_token: str,
    telegram_chat_id: str,
) -> None:
    with closing(_connect()) as conn:
        conn.execute(
            """
            INSERT INTO user_notification_settings(
              user_id, enabled, provider, notification_name, telegram_token, telegram_chat_id
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              enabled=excluded.enabled,
              provider=excluded.provider,
              notification_name=excluded.notification_name,
              telegram_token=excluded.telegram_token,
              telegram_chat_id=excluded.telegram_chat_id
            """,
            (
                user_id,
                int(enabled),
                provider,
                notification_name,
                telegram_token,
                telegram_chat_id,
            ),
        )
        conn.commit()


def delete_notification_settings(user_id: int) -> None:
    with closing(_connect()) as conn:
        conn.execute("DELETE FROM user_notification_settings WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM reminder_jobs WHERE user_id = ?", (user_id,))
        conn.commit()


def create_reminder_jobs(user_id: int, lead_minutes: int = 5) -> int:
    with closing(_connect()) as conn:
        now = datetime.now()
        rows = conn.execute(
            """
            SELECT t.id, t.title, t.date, t.start, u.full_name
            FROM tasks t
            JOIN users u ON u.id = t.user_id
            WHERE t.user_id = ?
              AND t.done = 0
            """,
            (user_id,),
        ).fetchall()
        created = 0
        for row in rows:
            try:
                task_dt = datetime.strptime(f"{row['date']} {row['start']}", "%Y-%m-%d %H:%M")
            except ValueError:
                continue
            send_at = task_dt - timedelta(minutes=lead_minutes)
            if send_at <= now:
                continue
            send_at_str = send_at.strftime("%Y-%m-%d %H:%M")
            message = f"Nhac nhe: {row['full_name']} - {row['title']} luc {row['start']} (con 5 phut)."
            cur = conn.execute(
                """
                INSERT OR IGNORE INTO reminder_jobs(user_id, task_id, send_at, message, sent)
                VALUES (?, ?, ?, ?, 0)
                """,
                (user_id, row["id"], send_at_str, message),
            )
            if cur.rowcount > 0:
                created += 1
        conn.commit()
        return created


def get_pending_jobs(now: datetime) -> list[dict]:
    now_str = now.strftime("%Y-%m-%d %H:%M")
    with closing(_connect()) as conn:
        rows = conn.execute(
            """
            SELECT r.id, r.user_id, r.task_id, r.send_at, r.message,
                   s.telegram_token, s.telegram_chat_id, s.enabled
            FROM reminder_jobs r
            JOIN user_notification_settings s ON s.user_id = r.user_id
            WHERE r.sent = 0
              AND r.send_at <= ?
              AND s.enabled = 1
              AND s.provider = 'telegram'
              AND s.telegram_token <> ''
              AND s.telegram_chat_id <> ''
            ORDER BY r.send_at ASC
            """,
            (now_str,),
        ).fetchall()
        return [dict(row) for row in rows]


def mark_job_sent(job_id: int) -> None:
    with closing(_connect()) as conn:
        conn.execute("UPDATE reminder_jobs SET sent = 1 WHERE id = ?", (job_id,))
        conn.commit()
