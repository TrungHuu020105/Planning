import { Plus, X, Check, Target, Repeat, TrendingUp } from "lucide-react";
import { useState } from "react";
import { MiniCalendar } from "./MiniCalendar";
import { fmtDate, weekDates, DAY_NAMES } from "@/lib/planner-types";
import type { PlannerState } from "@/lib/planner-types";
import { cn } from "@/lib/utils";

interface Props {
  state: PlannerState;
  selected: Date;
  weekAnchor: Date;
  onSelectDate: (d: Date) => void;
  addHabit: (n: string) => void;
  toggleHabit: (id: string, date: string) => void;
  deleteHabit: (id: string) => void;
  addGoal: (n: string) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
}

export function Sidebar(p: Props) {
  const [habitInput, setHabitInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const dates = weekDates(p.weekAnchor);
  const today = fmtDate(p.selected);

  const dayProgress = dates.map(d => {
    const ds = fmtDate(d);
    const dayTasks = p.state.tasks.filter(t => t.date === ds);
    const done = dayTasks.filter(t => t.done).length;
    return { ds, label: DAY_NAMES[dates.indexOf(d)].slice(0, 3), pct: dayTasks.length ? (done / dayTasks.length) * 100 : 0 };
  });

  return (
    <aside className="w-full lg:w-[320px] shrink-0 space-y-4">
      <MiniCalendar selected={p.selected} onSelect={p.onSelectDate} />

      <section className="rounded-2xl bg-card p-4 shadow-sm border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Weekly Progress</h3>
        </div>
        <div className="space-y-2">
          {dayProgress.map(d => (
            <div key={d.ds} className="flex items-center gap-2">
              <span className="text-xs w-8 text-muted-foreground">{d.label}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${d.pct}%` }} />
              </div>
              <span className="text-xs w-9 text-right text-muted-foreground tabular-nums">{Math.round(d.pct)}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-sm border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Repeat className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold flex-1">Habit Tracker</h3>
        </div>
        <ul className="space-y-1.5">
          {p.state.habits.map(h => {
            const done = !!h.done[today];
            return (
              <li key={h.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/50 transition">
                <button
                  onClick={() => p.toggleHabit(h.id, today)}
                  className={cn(
                    "h-5 w-5 rounded-md border-2 flex items-center justify-center transition",
                    done ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  )}
                >
                  {done && <Check className="h-3 w-3" />}
                </button>
                <span className={cn("flex-1 text-sm", done && "line-through text-muted-foreground")}>{h.name}</span>
                <button onClick={() => p.deleteHabit(h.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition">
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
        <form
          onSubmit={(e) => { e.preventDefault(); if (habitInput.trim()) { p.addHabit(habitInput.trim()); setHabitInput(""); } }}
          className="mt-3 flex gap-2"
        >
          <input
            value={habitInput}
            onChange={(e) => setHabitInput(e.target.value)}
            placeholder="New habit..."
            className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-card outline-none transition"
          />
          <button type="submit" className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-sm border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold flex-1">Goals</h3>
        </div>
        <ul className="space-y-1.5">
          {p.state.goals.map(g => (
            <li key={g.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/50 transition">
              <button
                onClick={() => p.toggleGoal(g.id)}
                className={cn(
                  "h-5 w-5 rounded-md border-2 flex items-center justify-center transition",
                  g.done ? "bg-primary border-primary text-primary-foreground" : "border-border"
                )}
              >
                {g.done && <Check className="h-3 w-3" />}
              </button>
              <span className={cn("flex-1 text-sm", g.done && "line-through text-muted-foreground")}>{g.name}</span>
              <button onClick={() => p.deleteGoal(g.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => { e.preventDefault(); if (goalInput.trim()) { p.addGoal(goalInput.trim()); setGoalInput(""); } }}
          className="mt-3 flex gap-2"
        >
          <input
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="New goal..."
            className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-card outline-none transition"
          />
          <button type="submit" className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </section>
    </aside>
  );
}
