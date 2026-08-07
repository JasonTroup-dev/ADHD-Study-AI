import type { StudyTask } from "@/components/ui/taskCard";
import type { AssignmentImportance } from "@/types/assignments";
import type { StudySession } from "@/types/database";

export type ClassOption = {
  id: string;
  name: string;
};

type AssignmentClass = {
  name: string;
};

export type UpcomingAssignment = {
  id: string;
  title: string;
  due_date: string;
  importance: AssignmentImportance;
  points: number | null;
  classes: AssignmentClass | AssignmentClass[] | null;
};

export type DashboardActiveStudySession = Pick<
  StudySession,
  "id" | "session_type" | "started_at" | "title"
>;

export type DashboardInitialData = {
  userId: string;
  dateString: string;
  formattedDate: string;
  classes: ClassOption[];
  tasks: StudyTask[];
  activeStudySession: DashboardActiveStudySession | null;
  upcomingAssignments: UpcomingAssignment[];
  todayStudyMinutes: number;
  todayStudySessionCount: number;
  studyError: string | null;
};

type StudyTaskRow = Omit<StudyTask, "priority"> & {
  priority: string | null;
};

type UpcomingAssignmentRow = Omit<
  UpcomingAssignment,
  "due_date" | "importance"
> & {
  due_date: string | null;
  importance: string;
};

export function normalizeStudyTasks(rows: StudyTaskRow[]): StudyTask[] {
  return rows.map((task) => ({
    ...task,
    priority: task.priority ?? "medium",
  }));
}

export function normalizeUpcomingAssignments(
  rows: UpcomingAssignmentRow[],
): UpcomingAssignment[] {
  return rows.flatMap((assignment) => {
    if (!assignment.due_date) return [];

    return [
      {
        ...assignment,
        due_date: assignment.due_date,
        importance: normalizeImportance(assignment.importance),
      },
    ];
  });
}

export function getUpcomingAssignmentClass(
  assignment: UpcomingAssignment,
): AssignmentClass | null {
  if (!assignment.classes) return null;

  return Array.isArray(assignment.classes)
    ? assignment.classes[0] ?? null
    : assignment.classes;
}

function normalizeImportance(value: string): AssignmentImportance {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }

  return "medium";
}
