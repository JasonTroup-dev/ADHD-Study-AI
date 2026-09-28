import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Eye,
  Flag,
  Target,
} from "lucide-react";
import Link from "next/link";

import { PinTaskButton } from '@/components/tasks/PinTaskButton';
import { WorkBreakdownPlanner } from '@/components/assignments/WorkBreakdownPlanner';
import { ResetStudySessionButton } from "@/components/study-sessions/ResetStudySessionButton";
import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";
import { AssignmentFileDropzone } from "@/components/tasks/AssignmentFileDropzone";
import { Button } from "@/components/ui/button";
import { estimateTaskMinutes } from "@/lib/assignments/estimateTaskTime";
import { getTaskOverview } from "@/lib/assignments/taskOverview";
import { getClassColor } from "@/lib/classColors";
import { inferTaskSessionType } from "@/lib/studySessions";
import { cn } from "@/lib/utils";

export type TaskDetailsData = {
  id: string;
  classId: string | null;
  assignmentId: string | null;
  title: string;
  priority: string | null;
  status: string;
  scheduledDate: string;
  pinned?: boolean;
  checklist?: string[];
  sourceEvidence?: string | null;
  studySessionId: string | null;
  taskClass: {
    name: string;
    color: string | null;
  } | null;
  assignment: {
    id: string;
    title: string;
    dueDate: string | null;
    originalFileName: string | null;
    extractedText: string | null;
    supportingMaterials: Array<{
      name: string;
      text: string | null;
    }>;
  } | null;
};

export function TaskDetailsView({
  task,
  returnHref,
  returnLabel,
  readOnly = false,
}: {
  task: TaskDetailsData;
  returnHref: string;
  returnLabel: string;
  readOnly?: boolean;
}) {
  const classColor = task.taskClass ? getClassColor(task.taskClass.color) : null;
  const supportingContextText = task.assignment?.supportingMaterials.find(
    (material) => material.text?.trim(),
  )?.text ?? null;
  const estimateMinutes = estimateTaskMinutes({
    taskTitle: task.title,
    assignmentFileName: task.assignment?.originalFileName ?? null,
    extractedText: supportingContextText ?? task.assignment?.extractedText ?? null,
  });
  const isCompleted = task.status === "completed";

  return (
    <div className="h-[calc(100svh-4rem)] overflow-hidden bg-slate-50 px-5 py-4 sm:px-8 md:h-svh md:py-6 lg:px-10">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
        <Link
          href={returnHref}
          className="inline-flex shrink-0 self-start items-center gap-2 rounded-md text-sm font-semibold text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to {returnLabel}
        </Link>

        <header className="mt-4 shrink-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            className={cn(
              "h-2 w-full",
              classColor?.accent ?? "bg-slate-300",
              isCompleted && "opacity-50",
            )}
          />
          <div className="p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
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
                    {task.taskClass?.name ?? "No class"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 capitalize text-slate-600">
                    <Flag className="size-3.5" aria-hidden="true" />
                    {task.priority ?? "No"} priority
                  </span>
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {task.title}
                </h1>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    Planned for {formatDate(task.scheduledDate)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <Circle className="size-4" aria-hidden="true" />
                    )}
                    {isCompleted ? "Completed" : "Not completed yet"}
                  </span>
                </div>
              </div>

              <div
                className="flex shrink-0 flex-wrap items-start justify-end gap-2"
                inert={readOnly || undefined}
                aria-disabled={readOnly || undefined}
              >
                <PinTaskButton taskId={task.id} pinned={task.pinned ?? false} />
                <ResetStudySessionButton plannerTaskId={task.id} className="shrink-0" />
                {isCompleted && task.studySessionId ? (
                  <Button asChild size="sm" className="shrink-0">
                    <Link href={`/study-session/${task.studySessionId}`}>
                      <Eye aria-hidden="true" />
                      View study session
                    </Link>
                  </Button>
                ) : !isCompleted ? (
                  <StartStudySessionButton
                    plannerTaskId={task.id}
                    assignmentId={task.assignmentId}
                    classId={task.classId}
                    title={task.title}
                    sessionType={inferTaskSessionType(task.title)}
                    label="Start task"
                    className="shrink-0"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1 lg:grid-cols-[minmax(0,1fr)_18rem] lg:overflow-hidden lg:pr-0">
          <div className="grid content-start gap-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Target className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                    Task overview
                  </p>
                  <h2 className="text-xl font-semibold text-slate-950">What this task involves</h2>
                </div>
              </div>
              <p className="mt-4 text-[15px] leading-6 text-slate-700">
                {getTaskOverview({
                  taskTitle: task.title,
                  primaryFileName: task.assignment?.originalFileName ?? null,
                  primaryText: task.assignment?.extractedText ?? null,
                  supportingMaterials: task.assignment?.supportingMaterials ?? [],
                })}
              </p>
              {task.checklist?.length ? <div className="mt-4 rounded-xl bg-emerald-50 p-4"><h3 className="text-sm font-semibold text-emerald-950">Done when</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-emerald-900">{task.checklist.map(item => <li key={item}>{item}</li>)}</ul></div> : null}
              {task.sourceEvidence ? <details className="mt-4 text-xs text-slate-600"><summary className="cursor-pointer font-medium">Source for this step</summary><blockquote className="mt-2 border-l-2 border-blue-200 pl-3 leading-5">{task.sourceEvidence}</blockquote></details> : null}
              {task.assignmentId && !readOnly ? <div className="mt-4"><WorkBreakdownPlanner assignmentId={task.assignmentId} /></div> : null}
              {task.assignment && task.assignment.title !== task.title ? (
                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Part of:</span>{" "}
                  {task.assignment.title}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                  <BookOpen className="size-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Assignment file</h2>
                  <p className="text-xs text-slate-600">Instructions, rubric, or assignment brief</p>
                </div>
              </div>
              <div
                className="mt-4"
                inert={readOnly || undefined}
                aria-disabled={readOnly || undefined}
              >
                <AssignmentFileDropzone
                  taskId={task.id}
                  assignmentId={task.assignment?.id ?? null}
                  currentFileName={task.assignment?.originalFileName ?? null}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            {estimateMinutes !== null ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <Clock3 className="size-5 text-emerald-700" aria-hidden="true" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Rough estimate
                </p>
                <p className="mt-1 text-3xl font-semibold text-emerald-950">
                  {formatEstimate(estimateMinutes)}
                </p>
                <p className="mt-2 text-xs leading-5 text-emerald-800">
                  Based on the readable requirements in the uploaded assignment material.
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-950">Assignment context</p>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Due date</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {task.assignment?.dueDate ? formatDate(task.assignment.dueDate) : "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">File status</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {task.assignment?.originalFileName
                      || task.assignment?.supportingMaterials.length
                      ? "Uploaded"
                      : "Needed"}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatEstimate(minutes: number) {
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `~${hours} hr ${remainingMinutes} min` : `~${hours} hr`;
}
