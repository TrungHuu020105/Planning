import { DayColumn } from "./DayColumn";
import { weekDates, fmtDate, DAY_NAMES } from "@/lib/planner-types";
import type { PlannerState, Task } from "@/lib/planner-types";

interface Props {
  weekAnchor: Date;
  selected: Date;
  state: PlannerState;
  onSelectDate: (d: Date) => void;
  addTask: (t: Omit<Task, "id" | "done">) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

export function WeekBoard(p: Props) {
  const dates = weekDates(p.weekAnchor);
  const todayStr = fmtDate(new Date());
  const selStr = fmtDate(p.selected);

  return (
    <div className="flex-1 min-w-0">
      <div className="flex gap-3 overflow-x-auto pb-4 lg:flex-row flex-col lg:overflow-x-auto -mx-1 px-1">
        {dates.map((d, i) => {
          const ds = fmtDate(d);
          return (
            <DayColumn
              key={ds}
              date={d}
              dayIndex={i}
              dayName={DAY_NAMES[i]}
              tasks={p.state.tasks.filter(t => t.date === ds).sort((a, b) => a.start.localeCompare(b.start))}
              isSelected={selStr === ds}
              isToday={todayStr === ds}
              onSelect={() => p.onSelectDate(d)}
              onAdd={p.addTask}
              onToggle={p.toggleTask}
              onDelete={p.deleteTask}
            />
          );
        })}
      </div>
    </div>
  );
}
