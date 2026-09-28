"use client";

import { useEffect, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  planningPreferencesSchema,
  type PlanningPreferences,
} from "@/lib/planner/preferences";
import type { PlannerPreview } from "@/lib/planner/types";
import type { dayWorkload } from "@/lib/planner/weeklyPlan";

export function DailyCapacity({
  date,
  today,
  workload,
  onChanged,
  onBusyChange,
  readOnly = false,
}: {
  date: string;
  today: string;
  workload: ReturnType<typeof dayWorkload>;
  onChanged: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
  readOnly?: boolean;
}) {
  const [preferences, setPreferences] = useState<PlanningPreferences | null>(
    null,
  );
  const [minutes, setMinutes] = useState("");
  const [preview, setPreview] = useState<PlannerPreview | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (readOnly) return;
    const controller = new AbortController();
    fetch("/api/planner", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "Your available time could not be loaded.",
          );
        if (controller.signal.aborted) return;
        const saved = planningPreferencesSchema.parse(data.preferences);
        setPreferences(saved);
        setMinutes(saved.dateMinutes?.[date]?.toString() ?? "");
        setUndoId(data.lastChangeId ?? null);
        setError(null);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Your available time could not be loaded.",
          );
      });
    return () => controller.abort();
  }, [date, readOnly, reload]);

  async function run(action: "preview" | "apply" | "undo") {
    if (busy || !preferences || readOnly) return;
    setBusy(true);
    onBusyChange(true);
    setError(null);
    const dateMinutes = { ...preferences.dateMinutes };
    if (minutes === "") delete dateMinutes[date];
    else dateMinutes[date] = Number(minutes);
    const nextPreferences = { ...preferences, dateMinutes };
    try {
      const response = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          planningDate: today,
          preferences: nextPreferences,
          version: preview?.version,
          ...(undoId ? { undoId } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setPreview(null);
        throw new Error(result.error || "Your plan could not be updated.");
      }
      if (action === "preview") setPreview(result);
      else {
        setPreview(null);
        onChanged(
          action === "undo"
            ? "Task dates restored. Your available time stays as saved."
            : "Your plan and available time are saved.",
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Your plan could not be updated.",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  const budget = minutes === "" ? null : Number(minutes);
  const changed =
    minutes !== (preferences?.dateMinutes?.[date]?.toString() ?? "");
  const over = budget !== null && workload.minutes > budget;
  const options = [
    ...new Set([
      0,
      20,
      30,
      45,
      60,
      90,
      120,
      ...(budget === null ? [] : [budget]),
    ]),
  ].sort((a, b) => a - b);
  const moves =
    preview?.blocks.filter(
      (block) => block.previousDate !== block.scheduledDate,
    ) ?? [];
  const shortDate = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return (
    <div className="mb-2 rounded-xl bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
          I have
          <select
            aria-label="Available study time"
            value={minutes}
            disabled={busy || readOnly || !preferences || date < today}
            onChange={(event) => {
              setMinutes(event.target.value);
              setPreview(null);
            }}
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-60"
          >
            <option value="">Choose time</option>
            {options.map((value) => (
              <option key={value} value={value}>
                {value === 0 ? "A day off" : `${value} minutes`}
              </option>
            ))}
          </select>
          {date === today ? "today" : "on this day"}
        </label>
        {workload.completed > 0 ? (
          <span className="text-xs text-slate-600">
            {workload.completed} {workload.completed === 1 ? "step" : "steps"}{" "}
            completed
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-slate-600" aria-live="polite">
        {workload.unknown
          ? `${workload.minutes ? `~${workload.minutes} min estimated · ` : ""}${workload.unknown} ${workload.unknown === 1 ? "step needs" : "steps need"} a time estimate`
          : `${workload.minutes ? "~" : ""}${workload.minutes} min remaining${budget !== null ? ` · ${Math.abs(budget - workload.minutes)} min ${over ? "over your time" : "left open"}` : ""}`}
      </p>
      {budget !== null && !workload.unknown ? (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"
          aria-hidden="true"
        >
          <div
            className={`h-full rounded-full ${over ? "bg-amber-600" : "bg-violet-600"}`}
            style={{
              width: `${budget === 0 ? (workload.minutes ? 100 : 0) : Math.min(100, (workload.minutes / budget) * 100)}%`,
            }}
          />
        </div>
      ) : null}
      {!readOnly && date >= today && (changed || over || preview) ? (
        <div className="mt-4 border-t border-slate-200 pt-3">
          {over ? (
            <p className="mb-3 text-sm text-amber-900">
              Let’s make room. Review what can move to another day.
            </p>
          ) : null}
          {!preview ? (
            <Button
              variant="outline"
              disabled={busy || !preferences}
              onClick={() => void run("preview")}
            >
              {busy ? "Checking your plan…" : "Preview adjusted plan"}
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <section aria-label="Adjusted plan preview" className="space-y-3">
              <p className="text-sm font-medium">
                {moves.length
                  ? `${moves.length} ${moves.length === 1 ? "step moves" : "steps move"} across your plan`
                  : "Your task dates can stay as they are."}
              </p>
              {moves.length > 0 ? (
                <ul className="space-y-2">
                  {moves.map((move) => (
                    <li
                      key={move.id}
                      className="rounded-lg border border-violet-100 bg-white p-3 text-sm"
                    >
                      <p className="font-medium">{move.title}</p>
                      <p className="mt-1 text-violet-700">
                        {move.previousDate
                          ? shortDate(move.previousDate)
                          : "Unscheduled"}{" "}
                        → {shortDate(move.scheduledDate)}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {move.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {preview.conflicts.length ? (
                <div
                  role="alert"
                  className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950"
                >
                  <p className="font-medium">
                    Some work needs attention before saving
                  </p>
                  <ul className="mt-2 list-disc space-y-2 pl-4">
                    {preview.conflicts.map((conflict, index) => (
                      <li key={index}>
                        {conflict.title}: {conflict.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="text-xs leading-5 text-slate-600">
                Deadlines stay unchanged. Started, completed, pinned, and
                manually edited tasks stay in place. Time limits use your
                estimates.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  disabled={busy || preview.conflicts.length > 0}
                  onClick={() => void run("apply")}
                >
                  {busy ? "Saving…" : "Use this plan"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setPreview(null)}
                >
                  Cancel preview
                </Button>
              </div>
            </section>
          )}
        </div>
      ) : null}
      {!readOnly && undoId ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 text-slate-600"
          disabled={busy}
          onClick={() => void run("undo")}
        >
          <RotateCcw aria-hidden="true" />
          Undo last task moves
        </Button>
      ) : null}
      {error ? (
        <div role="alert" className="mt-3 text-sm text-red-700">
          {error}
          {!preferences ? (
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => setReload((value) => value + 1)}
            >
              Retry availability
            </Button>
          ) : null}
        </div>
      ) : null}
      {readOnly ? (
        <p className="mt-2 text-xs text-slate-500">
          Sample plan · changes are disabled in the demo.
        </p>
      ) : null}
    </div>
  );
}
