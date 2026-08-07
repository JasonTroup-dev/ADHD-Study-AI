import { AlertCircle, BookOpen, CalendarClock, CheckCircle2, Clock3, FileText, Plus } from "lucide-react";
import Link from "next/link";

import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";
import { Button } from "@/components/ui/button";
import { getClassColor, type ClassColor } from "@/lib/classColors";
import {
  formatMaterialCount,
  getDueState,
  type CourseAssignment,
} from "@/lib/classes/classWorkspace";

export function ClassAssignmentsSection({
  classId,
  classColor,
  assignments,
}: {
  classId: string;
  classColor: ClassColor;
  assignments: CourseAssignment[];
}) {
  return (
    <section id="assignments">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Assignments</h2>
          <p className="mt-1 text-sm text-slate-600">Turn course work into focused study blocks.</p>
        </div>
        <Button asChild variant="outline" className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50">
          <Link href="#materials"><Plus className="h-4 w-4" aria-hidden="true" />Add Assignment</Link>
        </Button>
      </div>
      {assignments.length > 0 ? (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <CourseAssignmentCard key={assignment.id} classId={classId} classColor={classColor} assignment={assignment} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><BookOpen className="h-6 w-6" aria-hidden="true" /></div>
          <h3 className="mt-4 text-lg font-semibold text-slate-950">No assignments yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Add an assignment or upload instructions so this class can produce useful study blocks.</p>
        </div>
      )}
    </section>
  );
}

function CourseAssignmentCard({ classId, classColor, assignment }: { classId: string; classColor: ClassColor; assignment: CourseAssignment }) {
  const classColorOption = getClassColor(classColor);
  const dueState = getDueState(assignment, classColor);
  const isCompleted = assignment.status === "completed";
  const statusBadge = getAssignmentStatusBadge(assignment.status);
  const contextBadge = getContextBadge(assignment);
  const DueIcon = dueState.kind === "completed" ? CheckCircle2 : dueState.kind === "urgent" ? AlertCircle : CalendarClock;

  return (
    <article className={`relative flex flex-col gap-4 overflow-hidden rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between ${classColorOption.border} ${dueState.cardClass}`}>
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${classColorOption.accent}`} />
      <div className="min-w-0 flex-1 pl-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${dueState.badgeClass}`}><DueIcon className="h-3.5 w-3.5" aria-hidden="true" />{dueState.label}</span>
          <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadge.className}`}>{statusBadge.label}</span>
          <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${getImportanceClass(assignment.importance)}`}>{assignment.importance}</span>
        </div>
        <h3 className={`mt-3 truncate text-lg font-semibold ${isCompleted ? "text-slate-500 line-through" : "text-slate-950"}`}>{assignment.title}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4" aria-hidden="true" />{assignment.hasAssignmentFile ? "Instructions attached" : "No instructions"}</span>
          <span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4" aria-hidden="true" />{formatMaterialCount(assignment.materialCount)}</span>
          <span className={`inline-flex items-center gap-1.5 ${contextBadge.className}`}>{contextBadge.icon}{contextBadge.label}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 sm:flex-col sm:items-end">
        {!isCompleted ? (
          <StartStudySessionButton assignmentId={assignment.id} classId={classId} title={assignment.title} sessionType="assignment" label="Start Block" variant="outline" className="h-8 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50" />
        ) : (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Done</span>
        )}
      </div>
    </article>
  );
}

function getAssignmentStatusBadge(status: string) {
  if (status === "completed") return { label: "Completed", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (status === "in_progress") return { label: "In progress", className: "border-blue-200 bg-blue-50 text-blue-700" };
  return { label: "Not started", className: "border-slate-200 bg-slate-50 text-slate-700" };
}

function getContextBadge(assignment: CourseAssignment) {
  if (assignment.contextStatus === "ready") return { label: "AI context ready", className: "text-emerald-700", icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> };
  if (assignment.contextStatus === "processing") return { label: "Processing context", className: "text-blue-700", icon: <Clock3 className="h-4 w-4" aria-hidden="true" /> };
  if (assignment.contextStatus === "failed") return { label: "Needs re-upload", className: "text-red-700", icon: <AlertCircle className="h-4 w-4" aria-hidden="true" /> };
  return { label: assignment.hasAssignmentFile ? "Context pending" : "Needs context", className: "text-slate-600", icon: <FileText className="h-4 w-4" aria-hidden="true" /> };
}

function getImportanceClass(importance: string) {
  return ({ low: "border-emerald-200 bg-emerald-50 text-emerald-700", medium: "border-amber-200 bg-amber-50 text-amber-700", high: "border-orange-200 bg-orange-50 text-orange-700", critical: "border-red-200 bg-red-50 text-red-700" } as Record<string, string>)[importance] ?? "border-slate-200 bg-slate-50 text-slate-700";
}
