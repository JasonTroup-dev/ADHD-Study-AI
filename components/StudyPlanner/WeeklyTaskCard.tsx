"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Clock3, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskToggle } from "@/components/ui/taskToggle";
import { getTaskClassName } from "@/components/ui/taskCard";
import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";
import { inferTaskSessionType } from "@/lib/studySessions";
import type { WeeklyAssignment, WeeklyTask } from "@/lib/planner/weeklyPlan";

export function WeeklyTaskCard({
  task,
  assignment,
  recommended,
  readOnly,
  busy,
  onToggle,
  onChanged,
}: {
  task: WeeklyTask;
  assignment?: WeeklyAssignment;
  recommended: boolean;
  readOnly: boolean;
  busy: boolean;
  onToggle: (task: WeeklyTask) => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [estimate, setEstimate] = useState(
    task.estimated_minutes?.toString() ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completed = task.status === "completed";
  const firstStep = task.checklist?.find((step) => step.trim());
  const href = `${readOnly ? "/demo" : ""}/planner/tasks/${task.id}?from=planner`;
  async function saveEstimate(event: FormEvent) {
    event.preventDefault();
    if (saving || readOnly) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/study-plan-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimatedMinutes: estimate ? Number(estimate) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "The estimate could not be saved.");
      setEditing(false);
      onChanged();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The estimate could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <article
      className={`rounded-xl border p-4 sm:p-5 ${recommended ? "border-violet-200 bg-violet-50/40" : "border-slate-200 bg-white"}`}
    >
      {recommended ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-700">
          A good place to start
        </p>
      ) : null}
      <div className="flex items-start gap-3">
        <TaskToggle
          checked={completed}
          disabled={readOnly || busy}
          onCheckedChange={() => onToggle(task)}
          aria-label={`${completed ? "Mark as incomplete" : "Mark as complete"}: ${task.title}`}
          className="mt-1 size-5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-violet-700">
            <span>{getTaskClassName(task)}</span>
            {task.pinned ? (
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Pin className="size-3" aria-hidden="true" />
                Pinned
              </span>
            ) : null}
            {task.status === "in_progress" ? (
              <span className="text-slate-600">In progress</span>
            ) : null}
          </div>
          <h3
            className={`mt-1 text-base font-medium leading-6 break-words ${completed ? "text-slate-500 line-through" : "text-slate-950"}`}
          >
            <Link href={href} className="rounded hover:underline">
              {task.title}
            </Link>
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {task.estimated_minutes
                ? `About ${task.estimated_minutes} min`
                : "Time not estimated"}
            </span>
            {assignment?.due_date ? (
              <span>
                Due{" "}
                {new Date(`${assignment.due_date}T12:00:00`).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" },
                )}
              </span>
            ) : null}
          </div>
          {!completed && firstStep ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              <span className="font-medium text-slate-700">First step:</span>{" "}
              {firstStep}
            </p>
          ) : null}
          {!completed && !firstStep ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Open the task to review its instructions and materials.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!completed && !readOnly ? (
              <StartStudySessionButton
                plannerTaskId={task.id}
                assignmentId={task.assignment_id}
                classId={task.class_id}
                title={task.title}
                plannedMinutes={task.estimated_minutes}
                sessionType={inferTaskSessionType(task.title)}
                label={recommended ? "Start this step" : "Start studying"}
                variant={recommended ? "default" : "outline"}
                className={
                  recommended
                    ? "bg-violet-600 text-white hover:bg-violet-700"
                    : undefined
                }
              />
            ) : null}
            <Link
              href={href}
              className="rounded text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
            >
              View details
            </Link>
            {!readOnly && !completed ? (
              <button
                type="button"
                className="min-h-9 rounded text-sm text-slate-600 underline-offset-4 hover:underline"
                disabled={busy}
                onClick={() => {
                  setEditing(!editing);
                  setEstimate(task.estimated_minutes?.toString() ?? "");
                }}
              >
                {task.estimated_minutes ? "Edit time" : "Add time estimate"}
              </button>
            ) : null}
          </div>
          {editing ? (
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={saveEstimate}
            >
              <label className="text-xs text-slate-600">
                Estimated minutes
                <input
                  type="number"
                  min={1}
                  max={1440}
                  step={1}
                  value={estimate}
                  disabled={saving}
                  onChange={(event) => setEstimate(event.target.value)}
                  className="mt-1 block min-h-10 w-32 rounded-lg border border-slate-300 bg-white px-3 text-base"
                />
              </label>
              <Button size="sm" disabled={saving}>
                {saving ? "Saving…" : "Save estimate"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </form>
          ) : null}
          {error ? (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
