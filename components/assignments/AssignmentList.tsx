import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  FileText,
  Trash2,
} from "lucide-react";

import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";
import { Button } from "@/components/ui/button";
import { getClassColor } from "@/lib/classColors";
import type {
  Assignment,
  AssignmentImportance,
} from "@/types/assignments";

type AssignmentListProps = {
  assignments: Assignment[];
  isLoading: boolean;
  deletingAssignmentId: string | null;
  onDelete: (assignment: Assignment) => void;
};

type AssignmentGroup = {
  key: string;
  label: string;
  kind: "overdue" | "today" | "upcoming" | "unscheduled" | "completed";
  assignments: Assignment[];
};

const importanceStyles: Record<AssignmentImportance, string> = {
  low: "border-blue-200 bg-blue-50 text-blue-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-red-200 bg-red-50 text-red-700",
  critical: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
};

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatGroupDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function getAssignmentGroups(assignments: Assignment[]) {
  const todayKey = getDateKey();
  const activeByDate = new Map<string, Assignment[]>();
  const unscheduled: Assignment[] = [];
  const completed: Assignment[] = [];

  assignments.forEach((assignment) => {
    if (assignment.status === "completed") {
      completed.push(assignment);
      return;
    }

    const dueDateKey = assignment.due_date?.slice(0, 10);
    if (!dueDateKey) {
      unscheduled.push(assignment);
      return;
    }

    const dateAssignments = activeByDate.get(dueDateKey) ?? [];
    dateAssignments.push(assignment);
    activeByDate.set(dueDateKey, dateAssignments);
  });

  const groups: AssignmentGroup[] = [...activeByDate.entries()]
    .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
    .map(([dateKey, dateAssignments]) => ({
      key: dateKey,
      label: dateKey === todayKey ? "Today" : formatGroupDate(dateKey),
      kind:
        dateKey < todayKey
          ? "overdue"
          : dateKey === todayKey
            ? "today"
            : "upcoming",
      assignments: dateAssignments,
    }));

  if (unscheduled.length > 0) {
    groups.unshift({
      key: "unscheduled",
      label: "No due date",
      kind: "unscheduled",
      assignments: unscheduled,
    });
  }

  if (completed.length > 0) {
    groups.push({
      key: "completed",
      label: "Completed",
      kind: "completed",
      assignments: completed,
    });
  }

  return groups;
}

function getAssignmentClass(assignment: Assignment) {
  if (!assignment.classes) return null;
  return Array.isArray(assignment.classes)
    ? assignment.classes[0] ?? null
    : assignment.classes;
}

function GroupHeader({ group }: { group: AssignmentGroup }) {
  const headerStyles = {
    overdue: "border-red-200 text-slate-950",
    today: "rounded-lg border-blue-200 bg-blue-50 px-4 py-3 text-slate-950",
    upcoming: "border-slate-200 text-slate-950",
    unscheduled: "border-slate-200 text-slate-950",
    completed: "rounded-lg border-emerald-200 bg-emerald-50 px-4 py-3 text-slate-950",
  }[group.kind];

  return (
    <div
      className={`flex min-h-10 items-center gap-3 border-b pb-2 ${headerStyles}`}
    >
      <h2 className="text-[17px] font-semibold">{group.label}</h2>
      {group.kind === "overdue" ? (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[9px] leading-none">
            !
          </span>
          Overdue
        </span>
      ) : null}
    </div>
  );
}

function AssignmentCard({
  assignment,
  groupKind,
  deletingAssignmentId,
  onDelete,
}: {
  assignment: Assignment;
  groupKind: AssignmentGroup["kind"];
  deletingAssignmentId: string | null;
  onDelete: (assignment: Assignment) => void;
}) {
  const assignmentClass = getAssignmentClass(assignment);
  const classColor = assignmentClass
    ? getClassColor(assignmentClass.color)
    : null;
  const dueDateKey = assignment.due_date?.slice(0, 10) ?? null;
  const cardStyles =
    groupKind === "overdue"
      ? "border-red-200 bg-red-50/70"
      : groupKind === "completed"
        ? "border-emerald-200 bg-white"
        : "border-slate-200 bg-white";

  return (
    <article
      className={`group relative flex min-h-24 items-start justify-between gap-4 overflow-hidden rounded-2xl border px-5 py-5 transition-colors hover:border-slate-300 sm:px-6 ${cardStyles}`}
    >
      {classColor ? (
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1.5 ${classColor.accent}`}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <h3
          className={`truncate text-[17px] font-semibold text-slate-950 ${
            assignment.status === "completed" ? "text-slate-500 line-through" : ""
          }`}
        >
          {assignment.title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{assignmentClass?.name ?? "No class"}</span>
          </span>

          <span className="inline-flex items-center gap-1.5">
            {assignment.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
            )}
            {assignment.status === "completed"
              ? "Completed"
              : dueDateKey
                ? dueDateKey === getDateKey()
                  ? "Due today"
                  : `Due ${formatShortDate(dueDateKey)}`
                : "Unscheduled"}
          </span>

          {assignment.points !== null ? (
            <span>{assignment.points} pts</span>
          ) : null}

          {assignment.original_file_name ? (
            <span className="inline-flex max-w-48 items-center gap-1.5">
              <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{assignment.original_file_name}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${importanceStyles[assignment.importance]}`}
        >
          {assignment.importance}
        </span>

        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {assignment.status !== "completed" ? (
            <StartStudySessionButton
              assignmentId={assignment.id}
              classId={assignment.class_id}
              title={assignment.title}
              sessionType="assignment"
              variant="outline"
              className="h-7 px-2 text-xs"
            />
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-slate-500 hover:bg-red-50 hover:text-red-700"
            aria-label={`Delete ${assignment.title}`}
            disabled={deletingAssignmentId === assignment.id}
            onClick={() => onDelete(assignment)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function AssignmentList({
  assignments,
  isLoading,
  deletingAssignmentId,
  onDelete,
}: AssignmentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-8" aria-label="Loading assignments">
        {[0, 1].map((group) => (
          <div key={group} className="animate-pulse">
            <div className="mb-3 h-7 w-52 rounded-md bg-slate-200" />
            <div className="space-y-3">
              <div className="h-24 rounded-2xl border border-slate-200 bg-white" />
              <div className="h-24 rounded-2xl border border-slate-200 bg-white" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <BookOpen className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-950">
          No assignments yet
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Add an assignment and it will appear here by due date.
        </p>
      </div>
    );
  }

  const groups = getAssignmentGroups(assignments);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key}>
          <GroupHeader group={group} />
          <div className="mt-3 space-y-3">
            {group.assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                groupKind={group.kind}
                deletingAssignmentId={deletingAssignmentId}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
