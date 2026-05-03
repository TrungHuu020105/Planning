import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { fmtDate } from "@/lib/planner-types";
import { cn } from "@/lib/utils";

export function MiniCalendar({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const [view, setView] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const today = fmtDate(new Date());
  const sel = fmtDate(selected);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setView(new Date(year, month - 1, 1))} className="p-1 rounded-md hover:bg-accent">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold">
          {view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
        <button onClick={() => setView(new Date(year, month + 1, 1))} className="p-1 rounded-md hover:bg-accent">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const ds = fmtDate(c);
          const isToday = ds === today;
          const isSel = ds === sel;
          return (
            <button
              key={i}
              onClick={() => onSelect(c)}
              className={cn(
                "aspect-square rounded-lg text-xs transition-all hover:bg-accent",
                isSel && "bg-primary text-primary-foreground hover:bg-primary",
                !isSel && isToday && "ring-1 ring-primary text-primary font-semibold"
              )}
            >
              {c.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
