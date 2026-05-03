import { CalendarDays, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { formatRange } from "@/lib/planner-types";

interface Props {
  user: string;
  weekAnchor: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onLogout: () => void;
  showNotifyButton?: boolean;
  onToggleNotify?: () => void;
  showChangePasswordButton?: boolean;
  onToggleChangePassword?: () => void;
  totalDone: number;
  totalAll: number;
}

export function Header(p: Props) {
  const pct = p.totalAll ? Math.round((p.totalDone / p.totalAll) * 100) : 0;
  return (
    <header className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-10">
      <div className="px-4 lg:px-6 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Weekly Planner</h1>
            <p className="text-xs text-muted-foreground leading-tight">{formatRange(p.weekAnchor)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button onClick={p.onPrevWeek} className="p-1.5 rounded-lg hover:bg-accent transition"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={p.onToday} className="px-3 py-1 text-xs font-medium rounded-lg hover:bg-accent transition">Today</button>
          <button onClick={p.onNextWeek} className="p-1.5 rounded-lg hover:bg-accent transition"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-muted/60">
          <div className="h-1.5 w-24 rounded-full bg-background overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">{pct}% week</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {p.showNotifyButton && (
            <button
              onClick={p.onToggleNotify}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted/60 hover:bg-accent transition"
            >
              Notifications
            </button>
          )}
          {p.showChangePasswordButton && (
            <button
              onClick={p.onToggleChangePassword}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted/60 hover:bg-accent transition"
            >
              Change password
            </button>
          )}
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold leading-tight">{p.user || "Guest"}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Welcome back</div>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {(p.user || "G").charAt(0).toUpperCase()}
          </div>
          <button onClick={p.onLogout} title="Logout" className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive transition">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
