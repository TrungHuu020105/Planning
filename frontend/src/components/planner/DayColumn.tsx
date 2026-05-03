import { Plus, Inbox } from "lucide-react";
import { useState } from "react";
import { TaskItem } from "./TaskItem";
import { AddTaskForm } from "./AddTaskForm";
import type { Task } from "@/lib/planner-types";
import { fmtDate, DAY_TOKEN } from "@/lib/planner-types";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  dayIndex: number;
  dayName: string;
  tasks: Task[];
  isSelected: boolean;
  isToday: boolean;
  onSelect: () => void;
  onAdd: (t: Omit<Task, "id" | "done">) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DayColumn(p: Props) {
  const [adding, setAdding] = useState(false);
  const ds = fmtDate(p.date);
  const done = p.tasks.filter(t => t.done).length;
  const total = p.tasks.length;
  const pending = total - done;
  const pct = total ? (done / total) * 100 : 0;
  const tone = `bg-day-${DAY_TOKEN[p.dayIndex]}`;

  return (
    <div
      onClick={p.onSelect}
      className={cn(
        "flex flex-col w-full lg:w-[280px] shrink-0 rounded-2xl border bg-card shadow-sm transition-all cursor-pointer",
        p.isSelected ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-border"
      )}
    >
      <div className={cn("rounded-t-2xl p-3", tone)}>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-foreground/80">{p.dayName}</h3>
          {p.isToday && <span className="text-[10px] font-bold text-primary">TODAY</span>}
        </div>
        <div className="text-2xl font-bold tracking-tight">{p.date.getDate()}</div>
        <div className="text-xs text-muted-foreground">{p.date.toLocaleDateString("en-US", { month: "short" })}</div>
        <div className="mt-2 h-1.5 rounded-full bg-white/60 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-foreground/70">
          <span><b className="text-foreground">{done}</b> done</span>
          <span><b className="text-foreground">{pending}</b> pending</span>
          <span><b className="text-foreground">{total}</b> total</span>
        </div>
      </div>

      <div className="p-2 space-y-1.5 flex-1 min-h-[120px]">
        {p.tasks.length === 0 && !adding && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Inbox className="h-6 w-6 mb-1 opacity-50" />
            <p className="text-xs">No tasks yet</p>
          </div>
        )}
        {p.tasks.map(t => (
          <TaskItem key={t.id} task={t} onToggle={() => p.onToggle(t.id)} onDelete={() => p.onDelete(t.id)} />
        ))}
        {adding ? (
          <AddTaskForm date={ds} onAdd={p.onAdd} onClose={() => setAdding(false)} />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setAdding(true); }}
            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-primary hover:bg-accent/50 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add task
          </button>
        )}
      </div>
    </div>
  );
}
