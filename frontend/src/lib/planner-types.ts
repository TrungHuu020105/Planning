export type Category = "Learn" | "Chores" | "Exercise" | "Work" | "Study" | "Personal";

export const CATEGORIES: Category[] = ["Learn", "Chores", "Exercise", "Work", "Study", "Personal"];

export const CATEGORY_STYLES: Record<Category, string> = {
  Learn: "bg-amber-100 text-amber-800",
  Chores: "bg-rose-100 text-rose-800",
  Exercise: "bg-emerald-100 text-emerald-800",
  Work: "bg-sky-100 text-sky-800",
  Study: "bg-violet-100 text-violet-800",
  Personal: "bg-pink-100 text-pink-800",
};

export interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: Category;
  start: string; // HH:MM
  end: string;
  done: boolean;
}

export interface Habit {
  id: string;
  name: string;
  // map date -> done
  done: Record<string, boolean>;
}

export interface Goal {
  id: string;
  name: string;
  done: boolean;
}

export interface PlannerState {
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  user: string;
}

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_TOKEN = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay(); // 0 sun
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function weekDates(anchor: Date) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatRange(anchor: Date) {
  const dates = weekDates(anchor);
  const s = dates[0];
  const e = dates[6];
  const opt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opt)} - ${e.toLocaleDateString("en-US", opt)}, ${e.getFullYear()}`;
}
