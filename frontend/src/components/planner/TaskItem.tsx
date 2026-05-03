import { Check, X, Clock } from "lucide-react";
import type { Task } from "@/lib/planner-types";
import { CATEGORY_STYLES } from "@/lib/planner-types";
import { cn } from "@/lib/utils";

export function TaskItem({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className={cn(
      "group rounded-xl bg-card border border-border/60 p-2.5 transition-all hover:shadow-sm hover:border-border animate-in fade-in slide-in-from-top-1 duration-200",
      task.done && "opacity-60"
    )}>
      <div className="flex items-start gap-2">
        <button
          onClick={onToggle}
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 rounded-md border-2 flex items-center justify-center transition",
            task.done ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"
          )}
        >
          {task.done && <Check className="h-3 w-3" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className={cn("text-sm font-medium leading-snug", task.done && "line-through")}>{task.title}</div>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md", CATEGORY_STYLES[task.category])}>
              {task.category}
            </span>
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{task.start}–{task.end}
            </span>
          </div>
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
