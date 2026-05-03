import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { usePlanner } from "@/hooks/use-planner";
import { Header } from "@/components/planner/Header";
import { Sidebar } from "@/components/planner/Sidebar";
import { WeekBoard } from "@/components/planner/WeekBoard";
import { addDays, fmtDate, startOfWeek, weekDates } from "@/lib/planner-types";

export const Route = createFileRoute("/")({
  component: Planner,
});

function Planner() {
  const planner = usePlanner();
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPasswords, setNewPasswords] = useState<Record<number, string>>({});
  const [scanResult, setScanResult] = useState<string>("");
  const [lastScanAt, setLastScanAt] = useState<string>("");
  const [lastScanCreated, setLastScanCreated] = useState<number | null>(null);
  const [passwordResult, setPasswordResult] = useState<string>("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adminNotice, setAdminNotice] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [showNotifyPanel, setShowNotifyPanel] = useState(false);
  const [showReminderPanel, setShowReminderPanel] = useState(false);
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [notifyDraft, setNotifyDraft] = useState({
    enabled: false,
    provider: "telegram",
    notification_name: "",
    telegram_token: "",
    telegram_chat_id: "",
  });
  const weekAnchor = useMemo(() => startOfWeek(selected), [selected]);
  const hasSavedNotifyConfig =
    !!planner.notificationSettings.telegram_token && !!planner.notificationSettings.telegram_chat_id;

  useEffect(() => {
    setNotifyDraft({
      enabled: planner.notificationSettings.enabled,
      provider: planner.notificationSettings.provider,
      notification_name: planner.notificationSettings.notification_name,
      telegram_token: planner.notificationSettings.telegram_token,
      telegram_chat_id: planner.notificationSettings.telegram_chat_id,
    });
  }, [planner.notificationSettings]);

  if (!planner.me) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-4">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            planner.clearError();
            try {
              if (isRegister) {
                await planner.register(username.trim(), password, fullName.trim());
              } else {
                await planner.login(username.trim(), password);
              }
            } catch (err) {
              console.error(err);
            }
          }}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm"
        >
          <h1 className="text-xl font-bold">{isRegister ? "Register" : "Login"}</h1>
          {isRegister && (
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border outline-none focus:border-primary"
            />
          )}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border outline-none focus:border-primary"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border outline-none focus:border-primary"
          />
          {planner.error && <p className="text-sm text-red-600">{planner.error}</p>}
          <button type="submit" className="w-full py-2 rounded-lg bg-primary text-primary-foreground">
            {isRegister ? "Create account" : "Sign in"}
          </button>
          <button type="button" onClick={() => setIsRegister(!isRegister)} className="w-full py-2 text-sm hover:underline">
            {isRegister ? "Already have an account? Login" : "No account? Register"}
          </button>
        </form>
      </div>
    );
  }

  const weekStrs = weekDates(weekAnchor).map(fmtDate);
  const weekTasks = planner.state.tasks.filter((t) => weekStrs.includes(t.date));
  const totalDone = weekTasks.filter((t) => t.done).length;
  const now = new Date();
  const upcomingReminders = planner.state.tasks
    .filter((t) => !t.done)
    .map((t) => {
      const at = new Date(`${t.date}T${t.start}:00`);
      return { ...t, at };
    })
    .filter((t) => !Number.isNaN(t.at.getTime()) && t.at.getTime() >= now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={planner.me.full_name}
        weekAnchor={weekAnchor}
        onPrevWeek={() => setSelected(addDays(weekAnchor, -7))}
        onNextWeek={() => setSelected(addDays(weekAnchor, 7))}
        onToday={() => setSelected(new Date())}
        onLogout={() => void planner.logout()}
        showNotifyButton={planner.me.role !== "admin"}
        onToggleNotify={() => setShowNotifyPanel((s) => !s)}
        showReminderButton={planner.me.role !== "admin"}
        onToggleReminder={() => setShowReminderPanel((s) => !s)}
        showChangePasswordButton={planner.me.role !== "admin"}
        onToggleChangePassword={() => setShowPasswordPanel((s) => !s)}
        totalDone={totalDone}
        totalAll={weekTasks.length}
      />

      {planner.me.role === "admin" && (
        <section className="mx-auto max-w-[1600px] px-4 lg:px-6 py-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Admin: User Management</h2>
              <button onClick={() => void planner.adminRefreshUsers()} className="px-3 py-1 text-xs rounded-lg bg-muted">
                Refresh
              </button>
            </div>
            <div className="space-y-2">
              {planner.adminUsers.map((u) => (
                <div key={u.id} className="grid grid-cols-1 lg:grid-cols-[1fr,220px,260px] gap-2 items-center border border-border/60 rounded-xl p-2">
                  <div className="text-sm">
                    <b>{u.full_name}</b> ({u.username}) - {u.role}
                  </div>
                  <input
                    type="password"
                    value={newPasswords[u.id] ?? ""}
                    onChange={(e) => setNewPasswords((s) => ({ ...s, [u.id]: e.target.value }))}
                    placeholder="New password"
                    className="px-2 py-1.5 text-sm rounded-lg bg-muted/40 border border-border"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const nextPassword = (newPasswords[u.id] ?? "").trim() || "123456";
                        if (nextPassword.length < 6) {
                          window.alert("New password must be at least 6 characters.");
                          return;
                        }
                        try {
                          await planner.adminResetPassword(u.id, nextPassword);
                          setAdminNotice({ type: "ok", message: `Password reset for ${u.username}.` });
                        } catch (e) {
                          setAdminNotice({ type: "error", message: (e as Error).message || "Failed to reset password." });
                        }
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-amber-500 text-white"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await planner.adminDeleteUser(u.id);
                          setAdminNotice({ type: "ok", message: `User ${u.username} was deleted.` });
                        } catch (e) {
                          setAdminNotice({ type: "error", message: (e as Error).message || "Failed to delete user." });
                        }
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white"
                    >
                      Delete User
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {adminNotice && (
              <div
                className={
                  adminNotice.type === "ok"
                    ? "mt-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm"
                    : "mt-3 rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm"
                }
              >
                {adminNotice.message}
              </div>
            )}
          </div>
        </section>
      )}

      {planner.me.role !== "admin" && showNotifyPanel && (
        <section className="mx-auto max-w-[1600px] px-4 lg:px-6 py-3">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <div className="flex items-center gap-2">
              <input
                id="notify-enabled"
                type="checkbox"
                checked={notifyDraft.enabled}
                onChange={(e) =>
                  setNotifyDraft({
                    ...notifyDraft,
                    enabled: e.target.checked,
                  })
                }
              />
              <label htmlFor="notify-enabled" className="text-sm">
                Enable Telegram notifications
              </label>
            </div>
            {!hasSavedNotifyConfig && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <input
                  value={notifyDraft.notification_name}
                  onChange={(e) =>
                    setNotifyDraft({
                      ...notifyDraft,
                      notification_name: e.target.value,
                    })
                  }
                  placeholder="Notification name"
                  className="px-3 py-2 rounded-lg bg-muted/40 border border-border lg:col-span-2"
                />
                <input
                  value={notifyDraft.telegram_token}
                  onChange={(e) =>
                    setNotifyDraft({
                      ...notifyDraft,
                      telegram_token: e.target.value,
                    })
                  }
                  placeholder="Telegram Bot Token"
                  className="px-3 py-2 rounded-lg bg-muted/40 border border-border"
                />
                <input
                  value={notifyDraft.telegram_chat_id}
                  onChange={(e) =>
                    setNotifyDraft({
                      ...notifyDraft,
                      telegram_chat_id: e.target.value,
                    })
                  }
                  placeholder="Telegram Chat ID"
                  className="px-3 py-2 rounded-lg bg-muted/40 border border-border"
                />
              </div>
            )}
            {!!planner.notificationSettings.telegram_token && !!planner.notificationSettings.telegram_chat_id && (
              <div className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
                Notification: <b>{planner.notificationSettings.notification_name || "Untitled"}</b>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setScanResult("");
                  try {
                    await planner.saveNotificationSettings(notifyDraft);
                    setScanResult(
                      hasSavedNotifyConfig
                        ? "Notification settings updated."
                        : "Notification settings saved."
                    );
                  } catch (e) {
                    setScanResult((e as Error).message || "Failed to save notification settings.");
                  }
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/85 hover:-translate-y-0.5 active:translate-y-0"
              >
                {hasSavedNotifyConfig ? "Save" : "Add"}
              </button>
              <button
                onClick={async () => {
                  setScanResult("");
                  try {
                    const created = await planner.scanNotifications();
                    const scannedAt = new Date().toLocaleString();
                    setLastScanCreated(created);
                    setLastScanAt(scannedAt);
                    setScanResult(`Scan complete. Created ${created} reminder job(s).`);
                  } catch (e) {
                    setScanResult((e as Error).message || "Scan failed.");
                  }
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white transition-all duration-200 hover:bg-emerald-500 hover:-translate-y-0.5 active:translate-y-0"
              >
                Scan
              </button>
              <button
                onClick={async () => {
                  setScanResult("");
                  await planner.deleteNotificationSettings();
                  setScanResult("Previous notification settings deleted.");
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white transition-all duration-200 hover:bg-red-500 hover:-translate-y-0.5 active:translate-y-0"
              >
                Delete
              </button>
            </div>
            {scanResult && <p className="text-xs text-muted-foreground">{scanResult}</p>}
            {lastScanCreated !== null && lastScanAt && (
              <div className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
                Last scan: <b>{lastScanAt}</b> - Created <b>{lastScanCreated}</b> reminder job(s).
              </div>
            )}
          </div>
        </section>
      )}

      {planner.me.role !== "admin" && showReminderPanel && (
        <section className="mx-auto max-w-[1600px] px-4 lg:px-6 py-3">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Upcoming reminders</h2>
            {upcomingReminders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No upcoming reminders.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingReminders.map((task) => {
                  const diffMin = Math.max(
                    0,
                    Math.round((task.at.getTime() - now.getTime()) / 60000)
                  );
                  return (
                    <li
                      key={task.id}
                      className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs"
                    >
                      <div className="font-medium text-foreground">{task.title}</div>
                      <div className="text-muted-foreground">
                        {task.at.toLocaleString()} - in {diffMin} minute(s)
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {planner.me.role !== "admin" && showPasswordPanel && (
        <section className="mx-auto max-w-[1600px] px-4 lg:px-6 py-3">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Change password</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Current password"
                className="px-3 py-2 rounded-lg bg-muted/40 border border-border"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="px-3 py-2 rounded-lg bg-muted/40 border border-border"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setPasswordResult("");
                  if (!oldPassword.trim() || !newPassword.trim()) {
                    setPasswordResult("Please enter both current and new password.");
                    return;
                  }
                  if (newPassword.trim().length < 6) {
                    setPasswordResult("New password must be at least 6 characters.");
                    return;
                  }
                  try {
                    await planner.changePassword(oldPassword, newPassword);
                    setPasswordResult("Password changed successfully.");
                    setOldPassword("");
                    setNewPassword("");
                  } catch (e) {
                    setPasswordResult((e as Error).message || "Failed to change password.");
                  }
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-amber-600 text-white"
              >
                Change password
              </button>
            </div>
            {passwordResult && <p className="text-xs text-muted-foreground">{passwordResult}</p>}
          </div>
        </section>
      )}

      {planner.error && (
        <section className="mx-auto max-w-[1600px] px-4 lg:px-6 pt-3">
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
            {planner.error}
          </div>
        </section>
      )}

      {planner.me.role !== "admin" && (
        <main className="px-4 lg:px-6 py-5 flex flex-col lg:flex-row gap-5 max-w-[1600px] mx-auto">
          <Sidebar
            state={planner.state}
            selected={selected}
            weekAnchor={weekAnchor}
            onSelectDate={setSelected}
            addHabit={planner.addHabit}
            toggleHabit={planner.toggleHabit}
            deleteHabit={planner.deleteHabit}
            addGoal={planner.addGoal}
            toggleGoal={planner.toggleGoal}
            deleteGoal={planner.deleteGoal}
          />
          <WeekBoard
            weekAnchor={weekAnchor}
            selected={selected}
            state={planner.state}
            onSelectDate={setSelected}
            addTask={planner.addTask}
            toggleTask={planner.toggleTask}
            deleteTask={planner.deleteTask}
          />
        </main>
      )}
    </div>
  );
}
