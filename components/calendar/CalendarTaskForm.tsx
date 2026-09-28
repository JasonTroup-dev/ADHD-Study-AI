"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { CalendarClass, CalendarItem } from "@/lib/calendar/calendarItems";

export function CalendarTaskForm({
  date,
  task,
  classes,
  onSaved,
  onCancel,
  onBusyChange,
  onRefresh,
}: {
  date: string;
  task?: CalendarItem;
  classes: CalendarClass[];
  onSaved: (date: string) => void;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
  onRefresh: () => void;
}) {
  const [scheduledDate, setScheduledDate] = useState(date);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [minutes, setMinutes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    onBusyChange(true);
    setError(null);
    setNeedsRefresh(false);
    try {
      const response = await fetch("/api/calendar/tasks", {
        method: task ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          task
            ? { id: task.id, previousDate: task.date, date: scheduledDate }
            : {
                title: title.trim(),
                classId: classId || null,
                date: scheduledDate,
                estimatedMinutes: minutes ? Number(minutes) : null,
              },
        ),
      });
      const result = await response.json();
      setNeedsRefresh(response.status === 409);
      if (!response.ok)
        throw new Error(result.error ?? "The task could not be saved.");
      onSaved(scheduledDate);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The task could not be saved. Try again.",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  const inputClass =
    "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
  return (
    <form
      onSubmit={save}
      className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4"
      aria-label={task ? "Reschedule task" : "Add task"}
    >
      <h3 className="font-semibold text-slate-950">
        {task ? `Reschedule: ${task.title}` : "Add a study task"}
      </h3>
      <fieldset disabled={busy} className="space-y-4">
        {!task ? (
          <>
            <label className="block text-sm font-medium">
              Task title
              <input
                autoFocus
                required
                maxLength={300}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder="Review Chapter 4"
              />
            </label>
            <label className="block text-sm font-medium">
              Class
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className={inputClass}
              >
                <option value="">No class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Estimated minutes (optional)
              <input
                type="number"
                min={1}
                max={1440}
                step={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className={inputClass}
                placeholder="25"
              />
            </label>
          </>
        ) : null}
        <label className="block text-sm font-medium">
          Scheduled date
          <input
            type="date"
            autoFocus={Boolean(task)}
            required
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className={inputClass}
          />
        </label>
        {task?.dueDate && scheduledDate > task.dueDate ? (
          <p role="status" className="text-sm text-amber-900">
            This is after the assignment deadline ({task.dueDate}). The deadline
            will stay unchanged.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={
              needsRefresh ||
              (task ? scheduledDate === task.date : !title.trim())
            }
          >
            {busy ? "Saving…" : task ? "Move task" : "Save task"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {needsRefresh ? (
            <Button type="button" variant="outline" onClick={onRefresh}>
              Refresh calendar
            </Button>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
