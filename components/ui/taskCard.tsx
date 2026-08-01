import { cn } from "@/lib/utils";
import { TaskToggle } from "@/components/ui/taskToggle";
import { getClassColor } from "@/lib/classColors";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type StudyTask = {
  id: string;
  class_id: string | null;
  assignment_id: string | null;
  title: string;
  priority: string;
  status: string;
  scheduled_date: string;
  source?: "manual" | "generic_generated" | "context_generated";
  context_version?: number;
  user_edited?: boolean;
  classes:
    | {
        name: string;
        color: string | null;
      }
    | {
        name: string;
        color: string | null;
      }[]
    | null;
};

type TaskCardProps = {
  task: StudyTask;
  onToggle?: (task: StudyTask) => void;
  className?: string;
  detailsOrigin?: "dashboard" | "planner";
};

const priorityStyles: Record<string, { badge: string; dot: string }> = {
  low: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  medium: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  high: {
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  critical: {
    badge: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

const fallbackPriorityStyle = {
  badge: "border-gray-200 bg-gray-50 text-gray-600",
  dot: "bg-gray-400",
};

export function getTaskClassName(task: StudyTask) {
  if (!task.classes) return "No class";
  return Array.isArray(task.classes)
    ? task.classes[0]?.name ?? "No class"
    : task.classes.name;
}

function getTaskClass(task: StudyTask) {
  if (!task.classes) return null;
  return Array.isArray(task.classes) ? task.classes[0] ?? null : task.classes;
}

export function TaskCard({
  task,
  onToggle,
  className,
  detailsOrigin = "planner",
}: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const taskClass = getTaskClass(task);
  const classColor = taskClass ? getClassColor(taskClass.color) : null;
  const priorityStyle =
    priorityStyles[task.priority.toLowerCase()] ?? fallbackPriorityStyle;

  return (
    <div
      className={cn(
        "group relative grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-gray-300 hover:shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
        isCompleted &&
          "bg-gray-50/80 shadow-none hover:translate-y-0 hover:border-gray-200 hover:shadow-none",
        className,
      )}
    >
      <Link
        href={`/planner/tasks/${task.id}?from=${detailsOrigin}`}
        aria-label={`View details for ${task.title}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/35 focus-visible:ring-offset-2"
      >
        <span className="sr-only">View task details</span>
      </Link>

      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1.5",
          classColor?.accent ?? "bg-gray-300",
          isCompleted && "opacity-50",
        )}
      />

      <TaskToggle
        checked={isCompleted}
        onCheckedChange={() => onToggle?.(task)}
        aria-label={`${isCompleted ? "Mark as incomplete" : "Mark as complete"}: ${task.title}`}
        className="relative z-10 mt-0.5 size-5 cursor-pointer accent-gray-950 disabled:cursor-default"
      />

      <div className="min-w-0">
        <h3
          className={cn(
            "truncate text-sm font-semibold leading-5 text-gray-950 sm:text-base",
            isCompleted && "text-gray-500 line-through decoration-gray-400",
          )}
          title={task.title}
        >
          {task.title}
        </h3>

        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex min-w-0 items-center rounded-md border px-2 py-1 font-semibold",
              classColor
                ? [classColor.bg, classColor.border, classColor.text]
                : "border-gray-200 bg-gray-100 text-gray-700",
              isCompleted && "opacity-60",
            )}
          >
            <span className="truncate">{getTaskClassName(task)}</span>
          </span>

          <span aria-hidden="true" className="text-gray-300">
            ·
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium capitalize",
              priorityStyle.badge,
              isCompleted && "border-gray-200 bg-white text-gray-500",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                priorityStyle.dot,
                isCompleted && "bg-gray-400",
              )}
            />
            {task.priority}
          </span>
        </div>
      </div>

      <div className="col-start-2 flex items-center justify-end gap-2 text-gray-400 sm:col-start-3 sm:row-start-1">
        {isCompleted ? (
          <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">
            Done
          </span>
        ) : (
          <span className="text-xs font-semibold text-gray-500 opacity-0 transition-opacity group-hover:opacity-100">
            Details
          </span>
        )}
        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </div>
  );
}
