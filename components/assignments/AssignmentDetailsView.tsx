import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  Flag,
  ListChecks,
} from "lucide-react";
import Link from "next/link";

import {
  AssignmentMaterialsPanel,
  type AssignmentMaterialSummary,
} from "@/components/assignments/AssignmentMaterialsPanel";
import { CompleteAssignmentButton } from "@/components/assignments/CompleteAssignmentButton";
import { DeleteAssignmentButton } from "@/components/assignments/DeleteAssignmentButton";
import { Button } from "@/components/ui/button";
import { getClassColor } from "@/lib/classColors";
import { cn } from "@/lib/utils";

export type AssignmentDetailsData = {
  id: string;
  classId: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  deadlineEvidence?: unknown;
  importance: string;
  points: number | null;
  status: string;
  originalFileName: string | null;
  assignmentClass: {
    name: string;
    color: string | null;
  } | null;
  materials: AssignmentMaterialSummary[];
  tasks: AssignmentTask[];
};

type AssignmentTask = {
  id: string;
  title: string;
  priority: string | null;
  status: string;
  scheduledDate: string;
};

const priorityStyles: Record<string, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  critical: "border-red-200 bg-red-50 text-red-700",
};

export function AssignmentDetailsView({
  assignment,
  returnHref,
  returnLabel,
}: {
  assignment: AssignmentDetailsData;
  returnHref: string;
  returnLabel: string;
}) {
  const classColor = assignment.assignmentClass
    ? getClassColor(assignment.assignmentClass.color)
    : null;
  const evidence = assignment.deadlineEvidence && typeof assignment.deadlineEvidence === 'object' && 'quote' in assignment.deadlineEvidence ? assignment.deadlineEvidence as { quote?: string; origin?: string } : null;
  const completedTasks = assignment.tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const progress = assignment.tasks.length
    ? Math.round((completedTasks / assignment.tasks.length) * 100)
    : 0;

  return (
    <div className="min-h-full bg-slate-50 px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href={returnHref}
          className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to {returnLabel}
        </Link>

        <header className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            className={cn(
              "h-2 w-full",
              classColor?.accent ?? "bg-slate-300",
              assignment.status === "completed" && "opacity-50",
            )}
          />
          <div className="p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 font-semibold",
                      classColor
                        ? [classColor.bg, classColor.border, classColor.text]
                        : "border-slate-200 bg-slate-100 text-slate-700",
                    )}
                  >
                    {assignment.assignmentClass?.name ?? "No class"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 capitalize text-slate-600">
                    <Flag className="size-3.5" aria-hidden="true" />
                    {assignment.importance} importance
                  </span>
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {assignment.title}
                </h1>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    {assignment.dueDate
                      ? `Due ${formatDate(assignment.dueDate)}`
                      : "No due date"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {assignment.status === "completed" ? (
                      <CheckCircle2
                        className="size-4 text-emerald-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle className="size-4" aria-hidden="true" />
                    )}
                    {formatStatus(assignment.status)}
                  </span>
                  {assignment.points !== null ? (
                    <span>{assignment.points} points</span>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-3">
                <CompleteAssignmentButton
                  assignmentId={assignment.id}
                  isCompleted={assignment.status === "completed"}
                />
                <div className="min-w-40 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-900">Task progress</span>
                    <span className="text-slate-600">
                      {completedTasks}/{assignment.tasks.length}
                    </span>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    aria-label="Assignment task progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {evidence ? <details className="mt-4 text-sm text-slate-600"><summary className="cursor-pointer font-medium">Deadline evidence{evidence.origin === 'user' ? ' · date edited by you' : ''}</summary><blockquote className="mt-2 border-l-2 border-blue-200 pl-3 text-xs leading-5">{typeof evidence.quote === 'string' ? evidence.quote : 'No source passage was recorded.'}</blockquote></details> : null}
            {assignment.description ? (
              <p className="mt-5 max-w-3xl text-[15px] leading-6 text-slate-700">
                {assignment.description}
              </p>
            ) : null}

            {assignment.originalFileName ? (
              <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <FileText className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{assignment.originalFileName}</span>
              </div>
            ) : null}
          </div>
        </header>

        <section className="mt-6" aria-labelledby="assignment-tasks-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                Study plan
              </p>
              <h2
                id="assignment-tasks-heading"
                className="mt-1 text-xl font-semibold text-slate-950"
              >
                Tasks for this assignment
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Open a task to review its details and begin a focused study session.
              </p>
            </div>
            {assignment.tasks.length ? (
              <span className="shrink-0 text-sm font-medium text-slate-500">
                {assignment.tasks.length} {assignment.tasks.length === 1 ? "task" : "tasks"}
              </span>
            ) : null}
          </div>

          {assignment.tasks.length ? (
            <div className="mt-4 space-y-3">
              {assignment.tasks.map((task) => (
                <AssignmentTaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <ListChecks className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                No tasks for this assignment yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Generate or update your study plan to break this assignment into focused tasks.
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link href="/planner">Open planner</Link>
              </Button>
            </div>
          )}
        </section>

        <AssignmentMaterialsPanel
          assignmentId={assignment.id}
          initialMaterials={assignment.materials}
        />

        <section className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Delete this assignment
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Permanently remove this assignment and its attached study materials.
            </p>
          </div>
          <DeleteAssignmentButton
            assignmentId={assignment.id}
            assignmentTitle={assignment.title}
            returnHref={returnHref}
          />
        </section>
      </div>
    </div>
  );
}

function AssignmentTaskCard({ task }: { task: AssignmentTask }) {
  const isCompleted = task.status === "completed";
  const priorityClass =
    priorityStyles[task.priority?.toLowerCase() ?? ""] ??
    "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <Link
      href={`/planner/tasks/${task.id}?from=assignment`}
      aria-label={`View task details for ${task.title}`}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-slate-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:p-5",
        isCompleted && "bg-slate-50/80 shadow-none",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          isCompleted
            ? "bg-emerald-50 text-emerald-700"
            : "bg-blue-50 text-blue-700",
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="size-5" aria-hidden="true" />
        ) : (
          <BookOpen className="size-5" aria-hidden="true" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            "truncate font-semibold text-slate-950",
            isCompleted && "text-slate-500 line-through",
          )}
        >
          {task.title}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatDate(task.scheduledDate)}
          </span>
          <span className={cn("rounded-full border px-2 py-0.5 capitalize", priorityClass)}>
            {task.priority ?? "No priority"}
          </span>
          <span>{isCompleted ? "Completed" : "To do"}</span>
        </div>
      </div>

      <span className="hidden text-xs font-semibold text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
        View task
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(status: string) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return "Not started";
}
