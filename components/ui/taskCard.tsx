import { cn } from "@/lib/utils";
import { TaskToggle } from "@/components/ui/taskToggle";

export type StudyTask = {
  id: string;
  title: string;
  estimated_minutes: number | null;
  priority: string;
  status: string;
  scheduled_date: string;
  classes:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type TaskCardProps = {
  task: StudyTask;
  onToggle?: (task: StudyTask) => void;
  className?: string;
};

const priorityStyles: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export function getTaskClassName(task: StudyTask) {
  if (!task.classes) return "No class";
  return Array.isArray(task.classes)
    ? task.classes[0]?.name ?? "No class"
    : task.classes.name;
}

export function TaskCard({ task, onToggle, className }: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const priorityClass =
    priorityStyles[task.priority.toLowerCase()] ?? "bg-gray-100 text-gray-700";

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between rounded-xl border border-gray-200 p-4",
        isCompleted ? "bg-gray-50 opacity-60" : "bg-white",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <TaskToggle
          checked={isCompleted}
          onCheckedChange={() => onToggle?.(task)}
        />

        <div>
          <h3
            className={cn(
              "font-semibold",
              isCompleted ? "text-gray-500 line-through" : "text-gray-900"
            )}
          >
            {task.title}
          </h3>

          <p className="mt-2 text-sm text-gray-600">
            {task.estimated_minutes ?? 0} min * {getTaskClassName(task)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium capitalize",
            priorityClass
          )}
        >
          {task.priority}
        </span>

        <div className="h-5 w-5 rounded-full border border-gray-300" />
      </div>
    </div>
  );
}
