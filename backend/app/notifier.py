import threading
import time
import urllib.parse
import urllib.request
from .store import get_pending_jobs, mark_job_sent, now_vn_naive


def _send_telegram(bot_token: str, chat_id: str, message: str) -> None:
    payload = urllib.parse.urlencode({"chat_id": chat_id, "text": message}).encode("utf-8")
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req, timeout=10):
        pass


def _dispatch_due_jobs() -> None:
    due = get_pending_jobs(now_vn_naive())
    for job in due:
        try:
            _send_telegram(job["telegram_token"], job["telegram_chat_id"], job["message"])
            mark_job_sent(job["id"])
        except Exception:
            # Keep retrying unsent job on next cycle if sending fails.
            pass


def start_notification_dispatcher() -> None:
    def _loop():
        while True:
            _dispatch_due_jobs()
            time.sleep(20)

    threading.Thread(target=_loop, daemon=True, name="notification-dispatcher").start()
