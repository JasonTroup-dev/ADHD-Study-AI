import { cn } from "@/lib/utils";
import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";
import { TaskToggle } from "@/components/ui/taskToggle";
import { inferTaskSessionType } from "@/lib/studySessions";
import { getClassColor } from "@/lib/classColors";
import type { StudySession } from "@/types/database";

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
  activeStudySession?: StudySession | null;
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

function getTaskClass(task: StudyTask) {
  if (!task.classes) return null;
  return Array.isArray(task.classes) ? task.classes[0] ?? null : task.classes;
}

function normalizeSessionTitle(title: string | null | undefined) {
  return title?.trim().toLowerCase() ?? "";
}

function isActiveStudySessionForTask(
  task: StudyTask,
  session: StudySession | null | undefined,
) {
  if (!session || session.status !== "active") return false;
  if (session.session_type !== inferTaskSessionType(task.title)) return false;

  const titlesMatch =
    normalizeSessionTitle(session.title) === normalizeSessionTitle(task.title);

  if (!titlesMatch) return false;

  if (task.assignment_id) {
    return session.assignment_id === task.assignment_id;
  }

  return (
    !session.assignment_id &&
    (task.class_id ? session.class_id === task.class_id : true)
  );
}

export function TaskCard({
  task,
  activeStudySession,
  onToggle,
  className,
}: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const taskClass = getTaskClass(task);
  const classColor = taskClass ? getClassColor(taskClass.color) : null;
  const hasActiveStudySession = isActiveStudySessionForTask(
    task,
    activeStudySession,
  );
  const priorityClass =
    priorityStyles[task.priority.toLowerCase()] ?? "bg-gray-100 text-gray-700";

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        classColor
          ? [classColor.bg, classColor.border]
          : "border-gray-200 bg-white",
        isCompleted && "opacity-60",
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
            {getTaskClassName(task)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {!isCompleted && (
          <StartStudySessionButton
            plannerTaskId={task.id}
            assignmentId={task.assignment_id}
            classId={task.class_id}
            title={task.title}
            sessionType={inferTaskSessionType(task.title)}
            label={hasActiveStudySession ? "Resume" : undefined}
            loadingLabel={hasActiveStudySession ? "Resuming..." : undefined}
          />
        )}

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
