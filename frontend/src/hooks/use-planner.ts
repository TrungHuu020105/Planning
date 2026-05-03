import { useEffect, useState } from "react";
import type { Goal, Habit, PlannerState, Task } from "@/lib/planner-types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8001";
const TOKEN_KEY = "planner-token";

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: "admin" | "user";
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface AdminUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

interface NotificationSettings {
  enabled: boolean;
  provider: string;
  notification_name: string;
  telegram_token: string;
  telegram_chat_id: string;
}

function emptyState(user = ""): PlannerState {
  return { user, tasks: [], habits: [], goals: [] };
}

export function usePlanner() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  });
  const [me, setMe] = useState<AuthUser | null>(null);
  const [state, setState] = useState<PlannerState>(emptyState());
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string>("");
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: false,
    provider: "telegram",
    notification_name: "",
    telegram_token: "",
    telegram_chat_id: "",
  });

  const callApi = async <T,>(
    path: string,
    init?: RequestInit,
    authToken?: string | null
  ): Promise<T> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const effectiveToken = authToken ?? token;
    if (effectiveToken) headers.Authorization = `Bearer ${effectiveToken}`;
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(TOKEN_KEY);
        }
        setToken(null);
        setMe(null);
      }
      throw new Error(body.detail || `API error ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  };

  const loadPlanner = (authToken?: string | null) =>
    callApi<PlannerState>("/api/state", undefined, authToken).then(setState);
  const loadAdminUsers = (authToken?: string | null) =>
    callApi<AdminUser[]>("/api/admin/users", undefined, authToken).then(setAdminUsers);
  const loadNotificationSettings = (authToken?: string | null) =>
    callApi<NotificationSettings>("/api/notifications/settings", undefined, authToken).then(
      setNotificationSettings
    );

  useEffect(() => {
    if (!token) return;
    void callApi<AuthUser>("/api/auth/me")
      .then((user) => {
        setMe(user);
        if (user.role === "admin") {
          setState(emptyState(user.full_name));
          return loadAdminUsers();
        }
        return Promise.all([loadPlanner(), loadNotificationSettings()]).then(() => undefined);
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(TOKEN_KEY);
        }
        setToken(null);
        setMe(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sync = (next: Promise<PlannerState>) =>
    next.then(setState).catch((e: Error) => setError(e.message));

  const handleAuth = (result: AuthResponse) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, result.token);
    }
    setToken(result.token);
    setMe(result.user);
    setError("");
  };

  return {
    token,
    me,
    state,
    error,
    adminUsers,
    clearError: () => setError(""),
    login: async (username: string, password: string) => {
      try {
        const res = await callApi<AuthResponse>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });
        handleAuth(res);
        if (res.user.role === "admin") {
          setState(emptyState(res.user.full_name));
          await loadAdminUsers(res.token);
        } else {
          await Promise.all([loadPlanner(res.token), loadNotificationSettings(res.token)]);
        }
      } catch (e) {
        setError((e as Error).message);
        throw e;
      }
    },
    register: async (username: string, password: string, full_name: string) => {
      try {
        const res = await callApi<AuthResponse>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ username, password, full_name }),
        });
        handleAuth(res);
        if (res.user.role === "admin") {
          setState(emptyState(res.user.full_name));
          await loadAdminUsers(res.token);
        } else {
          await Promise.all([loadPlanner(res.token), loadNotificationSettings(res.token)]);
        }
      } catch (e) {
        setError((e as Error).message);
        throw e;
      }
    },
    logout: async () => {
      try {
        await callApi("/api/auth/logout", { method: "POST" });
      } catch {}
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
      }
      setToken(null);
      setMe(null);
      setState(emptyState());
      setAdminUsers([]);
      setNotificationSettings({
        enabled: false,
        provider: "telegram",
        notification_name: "",
        telegram_token: "",
        telegram_chat_id: "",
      });
    },
    changePassword: async (oldPassword: string, newPassword: string) => {
      await callApi("/api/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
    },
    addTask: (t: Omit<Task, "id" | "done">) =>
      sync(callApi("/api/tasks", { method: "POST", body: JSON.stringify(t) })),
    toggleTask: (id: string) =>
      sync(callApi(`/api/tasks/${id}/toggle`, { method: "PATCH" })),
    updateTask: (id: string, patch: Partial<Task>) =>
      sync(callApi(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) })),
    deleteTask: (id: string) =>
      sync(callApi(`/api/tasks/${id}`, { method: "DELETE" })),
    addHabit: (name: string) =>
      sync(callApi("/api/habits", { method: "POST", body: JSON.stringify({ name }) })),
    toggleHabit: (id: string, date: string) =>
      sync(callApi(`/api/habits/${id}/toggle`, { method: "PATCH", body: JSON.stringify({ date }) })),
    deleteHabit: (id: string) =>
      sync(callApi(`/api/habits/${id}`, { method: "DELETE" })),
    addGoal: (name: string) =>
      sync(callApi("/api/goals", { method: "POST", body: JSON.stringify({ name }) })),
    toggleGoal: (id: string) =>
      sync(callApi(`/api/goals/${id}/toggle`, { method: "PATCH" })),
    deleteGoal: (id: string) =>
      sync(callApi(`/api/goals/${id}`, { method: "DELETE" })),
    setUser: (user: string) =>
      sync(callApi("/api/user", { method: "PATCH", body: JSON.stringify({ user }) })),
    adminRefreshUsers: loadAdminUsers,
    adminDeleteUser: async (userId: number) => {
      await callApi(`/api/admin/users/${userId}`, { method: "DELETE" });
      await loadAdminUsers();
    },
    adminResetPassword: async (userId: number, newPassword: string) => {
      await callApi(`/api/admin/users/${userId}/reset-password`, {
        method: "PATCH",
        body: JSON.stringify({ new_password: newPassword }),
      });
    },
    notificationSettings,
    setNotificationSettingsLocal: (next: NotificationSettings) => setNotificationSettings(next),
    saveNotificationSettings: async (next: NotificationSettings) => {
      const saved = await callApi<NotificationSettings>("/api/notifications/settings", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      setNotificationSettings(saved);
    },
    scanNotifications: async () => {
      const result = await callApi<{ created: number }>("/api/notifications/scan", {
        method: "POST",
      });
      return result.created;
    },
    deleteNotificationSettings: async () => {
      const saved = await callApi<NotificationSettings>("/api/notifications/settings", {
        method: "DELETE",
      });
      setNotificationSettings(saved);
    },
  };
}
