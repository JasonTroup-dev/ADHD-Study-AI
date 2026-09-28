"use client";

import Link from "next/link";
import { Check, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";
import { getClassColor } from "@/lib/classColors";
import { inferTaskSessionType } from "@/lib/studySessions";
import { itemUrgency, type CalendarItem } from "@/lib/calendar/calendarItems";
import { cn } from "@/lib/utils";

export function CalendarItemCard({
  item,
  today,
  readOnly,
  onReschedule,
}: {
  item: CalendarItem;
  today: string;
  readOnly: boolean;
  onReschedule?: (task: CalendarItem) => void;
}) {
  const color = getClassColor(item.classColor);
  const href = readOnly
    ? item.kind === "task"
      ? `/demo/planner/tasks/${item.id}?from=calendar`
      : null
    : `/planner/${item.kind === "task" ? "tasks" : "assignments"}/${item.id}?from=calendar`;
  const overdue = !item.isComplete && item.date < today;
  return (
    <article className={cn("rounded-xl border bg-white p-4", color.border)}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className={cn("rounded-md px-2 py-1", color.bg, color.text)}>
          {item.className}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1",
            overdue ? "text-amber-800" : "text-slate-600",
          )}
        >
          {item.isComplete ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : item.kind === "assignment" ? (
            <ClipboardList className="size-3.5" aria-hidden="true" />
          ) : null}
          {itemUrgency(item, today)}
        </span>
        {item.kind === "task" &&
        item.estimatedMinutes != null &&
        item.estimatedMinutes > 0 ? (
          <span className="text-slate-600">~{item.estimatedMinutes} min</span>
        ) : null}
      </div>
      <h3
        className={cn(
          "mt-2 break-words font-semibold text-slate-950",
          item.isComplete && "text-slate-500 line-through",
        )}
      >
        {item.title}
      </h3>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!readOnly && !item.isComplete && item.kind === "task" ? (
          <>
            <StartStudySessionButton
              plannerTaskId={item.id}
              assignmentId={item.assignmentId}
              classId={item.classId}
              title={item.title}
              sessionType={inferTaskSessionType(item.title)}
              label="Start studying"
            />
            {onReschedule ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReschedule(item)}
              >
                Reschedule
              </Button>
            ) : null}
          </>
        ) : null}
        {href ? (
          <Link
            className="rounded-md px-2 py-2 text-sm font-medium text-blue-700 underline underline-offset-4 focus-visible:outline-2"
            href={href}
          >
            View details<span className="sr-only"> for {item.title}</span>
          </Link>
        ) : null}
      </div>
    </article>
  );
}
