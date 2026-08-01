import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Flag,
  Target,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AssignmentFileDropzone } from "@/components/tasks/AssignmentFileDropzone";
import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";
import { estimateTaskMinutes } from "@/lib/assignments/estimateTaskTime";
import { getClassColor } from "@/lib/classColors";
import { createClient } from "@/lib/supabase/server";
import { inferTaskSessionType } from "@/lib/studySessions";
import { cn } from "@/lib/utils";

type TaskDetailsPageProps = {
  params: Promise<{ id: string }>;
};

type TaskAssignment = {
  id: string;
  title: string;
  due_date: string | null;
  original_file_name: string | null;
  extracted_text: string | null;
};

type TaskClass = {
  name: string;
  color: string | null;
};

export default async function TaskDetailsPage({ params }: TaskDetailsPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: task, error } = await supabase
    .from("study_plan_tasks")
    .select(`
      id,
      class_id,
      assignment_id,
      title,
      priority,
      status,
      scheduled_date,
      classes (name, color),
      assignments (
        id,
        title,
        due_date,
        original_file_name,
        extracted_text
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error("The task details could not be loaded.");
  if (!task) notFound();

  const assignment = getSingleRelation(task.assignments) as TaskAssignment | null;
  const taskClass = getSingleRelation(task.classes) as TaskClass | null;
  const classColor = taskClass ? getClassColor(taskClass.color) : null;
  const estimateMinutes = estimateTaskMinutes({
    taskTitle: task.title,
    assignmentFileName: assignment?.original_file_name ?? null,
    extractedText: assignment?.extracted_text ?? null,
  });
  const isCompleted = task.status === "completed";

  return (
    <div className="h-[calc(100svh-4rem)] overflow-hidden bg-slate-50 px-5 py-4 sm:px-8 md:h-svh md:py-6 lg:px-10">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
        <Link
          href="/planner"
          className="inline-flex shrink-0 self-start items-center gap-2 rounded-md text-sm font-semibold text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to planner
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
                    {taskClass?.name ?? "No class"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 capitalize text-slate-600">
                    <Flag className="size-3.5" aria-hidden="true" />
                    {task.priority} priority
                  </span>
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {task.title}
                </h1>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    Planned for {formatDate(task.scheduled_date)}
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

              {!isCompleted ? (
                <StartStudySessionButton
                  plannerTaskId={task.id}
                  assignmentId={task.assignment_id}
                  classId={task.class_id}
                  title={task.title}
                  sessionType={inferTaskSessionType(task.title)}
                  label="Start task"
                  className="shrink-0"
                />
              ) : null}
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
                {getTaskOverview(assignment)}
              </p>
              {assignment && assignment.title !== task.title ? (
                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Part of:</span>{" "}
                  {assignment.title}
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
              <div className="mt-4">
                <AssignmentFileDropzone
                  taskId={task.id}
                  assignmentId={assignment?.id ?? null}
                  currentFileName={assignment?.original_file_name ?? null}
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
                  Based on the readable requirements in the uploaded assignment file.
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-950">Assignment context</p>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Due date</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {assignment?.due_date ? formatDate(assignment.due_date) : "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">File status</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {assignment?.original_file_name ? "Uploaded" : "Needed"}
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

function getSingleRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function getTaskOverview(assignment: TaskAssignment | null) {
  if (!assignment?.original_file_name) {
    return "There isn’t enough detail to provide an accurate overview yet. Upload the assignment file below so the overview can be based on the actual instructions.";
  }

  const fileExcerpt = getAssignmentExcerpt(assignment.extracted_text);
  if (fileExcerpt) {
    return `Based on the uploaded assignment brief: ${fileExcerpt}`;
  }

  return "The assignment file is uploaded, but there isn’t enough readable detail to provide an accurate overview yet. Try replacing it with a text-based PDF, DOCX, TXT, or Markdown file.";
}

function getAssignmentExcerpt(extractedText: string | null) {
  if (!extractedText?.trim()) return null;

  const normalizedText = extractedText.replace(/\s+/g, " ").trim();
  const sentences = normalizedText
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length >= 30);
  const excerpt = (sentences.slice(0, 2).join(" ") || normalizedText).trim();

  if (excerpt.length <= 420) return excerpt;

  const shortenedExcerpt = excerpt.slice(0, 417);
  const lastSpaceIndex = shortenedExcerpt.lastIndexOf(" ");
  return `${shortenedExcerpt.slice(0, lastSpaceIndex > 300 ? lastSpaceIndex : 417)}…`;
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
