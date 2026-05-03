import { useState } from "react";
import { CATEGORIES, type Category, type Task } from "@/lib/planner-types";
import { Plus } from "lucide-react";

export function AddTaskForm({ date, onAdd, onClose }: { date: string; onAdd: (t: Omit<Task, "id" | "done">) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Personal");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd({ date, title: title.trim(), category, start, end });
        onClose();
      }}
      className="rounded-xl bg-muted/40 border border-dashed border-border p-2.5 space-y-2"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title..."
        className="w-full text-sm px-2.5 py-1.5 rounded-lg bg-card border border-border focus:border-primary outline-none"
      />
      <div className="flex gap-1.5">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-card border border-border outline-none"
        >
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex gap-1.5">
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-card border border-border outline-none" />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-card border border-border outline-none" />
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={onClose} className="flex-1 text-xs py-1.5 rounded-lg hover:bg-accent transition">Cancel</button>
        <button type="submit" className="flex-1 text-xs py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center justify-center gap-1">
          <Plus className="h-3 w-3" />Add
        </button>
      </div>
    </form>
  );
}
