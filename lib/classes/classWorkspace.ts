import {
  AlertCircle,
  Brain,
  CalendarClock,
  CalendarDays,
  Clock3,
  Plus,
  Sparkles,
  Target,
  Upload,
  type LucideIcon,
} from "lucide-react";

import type {
  ClassAssignmentOption,
  ClassMaterial,
} from "@/components/classes/class-materials/types";
import { getClassColor, type ClassColor } from "@/lib/classColors";
import { createClient } from "@/lib/supabase/server";
import type { StudySessionType } from "@/types/database";

export type Course = {
  name: string;
  code: string;
  instructor: string;
  color: ClassColor;
};

export type FlashcardSet = {
  id: string;
  title: string;
  lastStudied: string;
  mastery: number;
  cardCount: number;
  href: string;
};

export type CourseAssignment = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  importance: string;
  hasAssignmentFile: boolean;
  materialCount: number;
  contextStatus: string;
};

export type CourseProgress = {
  overallPercent: number;
  completedAssignments: number;
  totalAssignments: number;
  flashcardMasteryPercent: number;
  flashcardCount: number;
  studyStreakDays: number;
};

export type QuickAction = { label: string; icon: LucideIcon; href: string };

export type WeekItem = {
  id: string;
  title: string;
  date: string;
  kind: "task" | "assignment";
  status: string;
};

export type NextUpAction =
  | { type: "link"; label: string; href: string }
  | {
      type: "study";
      label: string;
      title: string;
      classId: string;
      assignmentId?: string | null;
      plannerTaskId?: string;
      flashcardSetId?: string | null;
      sessionType: StudySessionType;
    };

export type NextUpItem = {
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  icon: LucideIcon;
  tone: "slate" | "amber" | "emerald" | "blue";
  action: NextUpAction;
};

type ClassRow = {
  name: string | null;
  class_code: string | null;
  prof_name: string | null;
  color: string | null;
};

type FlashcardSetRow = {
  id: string;
  title: string | null;
  created_at: string | null;
  flashcards?: { mastery_level: number | null }[] | null;
};

type NoteRow = {
  id: string;
  title: string | null;
  source_type: string | null;
  created_at: string | null;
};

type AssignmentRow = {
  id: string;
  title: string | null;
  due_date: string | null;
  status: string | null;
  importance: string | null;
  original_file_name: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  context_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AssignmentMaterialRow = {
  id: string;
  assignment_id: string;
  original_file_name: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  created_at: string | null;
};

export type StudySessionRow = {
  id?: string;
  title?: string | null;
  assignment_id?: string | null;
  class_id?: string | null;
  planned_minutes?: number | null;
  actual_minutes?: number | null;
  session_type?: StudySessionType | null;
  started_at?: string | null;
  ended_at: string | null;
};

export type PlannerTaskRow = {
  id: string;
  assignment_id: string | null;
  title: string | null;
  priority: string | null;
  status: string | null;
  scheduled_date: string | null;
};

export type ClassWorkspaceData = {
  course: Course;
  flashcardSets: FlashcardSet[];
  materials: ClassMaterial[];
  materialCount: number;
  assignments: ClassAssignmentOption[];
  assignmentSummaries: CourseAssignment[];
  plannerTasks: PlannerTaskRow[];
  activeSession: StudySessionRow | null;
  courseProgress: CourseProgress;
  weekItems: WeekItem[];
};

const fallbackCourse: Course = {
  name: "Calculus II",
  code: "MATH 2414",
  instructor: "Dr. Sarah Chen",
  color: "blue",
};

export async function getClassWorkspaceData(
  classId: string,
): Promise<ClassWorkspaceData> {
  const todayKey = getDateKey();
  const weekAheadKey = getDateKey(addDays(new Date(), 7));

  try {
    const supabase = await createClient();
    const [
      courseResult,
      flashcardResult,
      notesResult,
      assignmentsResult,
      studySessionsResult,
      activeSessionResult,
      plannerTasksResult,
    ] = await Promise.all([
      supabase.from("classes").select("name, class_code, prof_name, color").eq("id", classId).maybeSingle(),
      supabase.from("flashcard_sets").select("id, title, created_at, flashcards(mastery_level)").eq("class_id", classId).order("created_at", { ascending: false }),
      supabase.from("notes").select("id, title, source_type, created_at").eq("class_id", classId).order("created_at", { ascending: false }).limit(3),
      supabase.from("assignments").select("id, title, due_date, status, importance, original_file_name, file_type, file_size_bytes, context_status, created_at, updated_at").eq("class_id", classId).order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("study_sessions").select("id, title, assignment_id, class_id, planned_minutes, actual_minutes, session_type, started_at, ended_at").eq("class_id", classId).eq("status", "completed").not("ended_at", "is", null).order("ended_at", { ascending: false }),
      supabase.from("study_sessions").select("id, title, assignment_id, class_id, planned_minutes, actual_minutes, session_type, started_at, ended_at").eq("class_id", classId).eq("status", "active").order("started_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("study_plan_tasks").select("id, assignment_id, title, priority, status, scheduled_date").eq("class_id", classId).gte("scheduled_date", todayKey).lte("scheduled_date", weekAheadKey).order("scheduled_date", { ascending: true }).order("created_at", { ascending: true }),
    ]);

    const courseRow = courseResult.data as ClassRow | null;
    const course = courseRow
      ? {
          name: courseRow.name ?? fallbackCourse.name,
          code: courseRow.class_code ?? fallbackCourse.code,
          instructor: courseRow.prof_name ?? fallbackCourse.instructor,
          color: getClassColor(courseRow.color).value,
        }
      : fallbackCourse;
    const dbFlashcardSets = (flashcardResult.data ?? []) as FlashcardSetRow[];
    const flashcardSets = dbFlashcardSets.slice(0, 3).map(toFlashcardSet);
    const dbNotes = (notesResult.data ?? []) as NoteRow[];
    const dbAssignments = (assignmentsResult.data ?? []) as AssignmentRow[];
    const dbStudySessions = (studySessionsResult.data ?? []) as StudySessionRow[];
    const dbPlannerTasks = (plannerTasksResult.data ?? []) as PlannerTaskRow[];
    const activeSession = activeSessionResult.data as StudySessionRow | null;
    const assignmentIds = dbAssignments.map((assignment) => assignment.id);
    let dbAssignmentMaterials: AssignmentMaterialRow[] = [];

    if (assignmentIds.length > 0) {
      const materialsResult = await supabase
        .from("assignment_materials")
        .select("id, assignment_id, original_file_name, file_type, file_size_bytes, created_at")
        .in("assignment_id", assignmentIds)
        .order("created_at", { ascending: false });
      dbAssignmentMaterials = (materialsResult.data ?? []) as AssignmentMaterialRow[];
    }

    const materialCountByAssignment = getMaterialCountByAssignment(dbAssignmentMaterials);
    const assignments = dbAssignments.map(toAssignmentOption);
    const assignmentSummaries = getAssignmentSummaries(
      dbAssignments,
      materialCountByAssignment,
    );
    const assignmentTitleById = new Map(
      dbAssignments.map((assignment) => [
        assignment.id,
        assignment.title ?? "Untitled Assignment",
      ]),
    );
    const materials = buildMaterials(
      dbAssignments,
      dbAssignmentMaterials,
      dbNotes,
      assignmentTitleById,
    );

    return {
      course,
      flashcardSets,
      courseProgress: getCourseProgress(dbAssignments, dbFlashcardSets, dbStudySessions),
      assignments,
      assignmentSummaries,
      plannerTasks: dbPlannerTasks,
      activeSession,
      materials,
      materialCount: materials.length,
      weekItems: getWeekItems(dbPlannerTasks, assignmentSummaries, todayKey, weekAheadKey),
    };
  } catch {
    return emptyWorkspaceData();
  }
}

export function getNextUp({
  classId,
  classColor,
  activeSession,
  plannerTasks,
  assignments,
  flashcardSets,
  materialCount,
}: {
  classId: string;
  classColor: ClassColor;
  activeSession: StudySessionRow | null;
  plannerTasks: PlannerTaskRow[];
  assignments: CourseAssignment[];
  flashcardSets: FlashcardSet[];
  materialCount: number;
}): NextUpItem {
  const todayKey = getDateKey();
  const weekAheadKey = getDateKey(addDays(new Date(), 7));

  if (activeSession?.id) {
    return {
      eyebrow: "Resume",
      title: activeSession.title ?? "Active Study Block",
      description: "Pick up the guided study block already in progress.",
      meta: `Started ${formatRelativeTime(activeSession.started_at ?? null)}`,
      icon: Clock3,
      tone: "emerald",
      action: { type: "link", label: "Resume Block", href: `/study-session/${activeSession.id}` },
    };
  }

  const todaysTask = plannerTasks.find(
    (task) => task.status !== "completed" && task.scheduled_date?.slice(0, 10) === todayKey,
  );
  if (todaysTask) {
    return {
      eyebrow: "Today",
      title: todaysTask.title ?? "Study Block",
      description: "This block is already on your planner for this class.",
      meta: `Scheduled for ${formatShortDate(todayKey)}`,
      icon: Target,
      tone: "blue",
      action: {
        type: "study",
        label: "Start Block",
        title: todaysTask.title ?? "Study Block",
        classId,
        assignmentId: todaysTask.assignment_id,
        plannerTaskId: todaysTask.id,
        sessionType: inferTaskSessionType(todaysTask.title ?? ""),
      },
    };
  }

  const dueSoonAssignment = assignments.find((assignment) => {
    const dueDate = assignment.dueDate?.slice(0, 10);
    return assignment.status !== "completed" && Boolean(dueDate) && dueDate! <= weekAheadKey;
  });
  if (dueSoonAssignment) {
    const dueState = getDueState(dueSoonAssignment, classColor);
    return {
      eyebrow: dueState.label,
      title: dueSoonAssignment.title,
      description: dueSoonAssignment.hasAssignmentFile
        ? "The assignment instructions are attached, so the guided session can stay grounded."
        : "Add instructions when you can, or start with the assignment details already saved.",
      meta: dueSoonAssignment.materialCount > 0
        ? formatMaterialCount(dueSoonAssignment.materialCount)
        : "No materials attached yet",
      icon: dueState.isUrgent ? AlertCircle : CalendarClock,
      tone: dueState.isUrgent ? "amber" : "slate",
      action: {
        type: "study",
        label: "Work on It",
        title: dueSoonAssignment.title,
        classId,
        assignmentId: dueSoonAssignment.id,
        sessionType: "assignment",
      },
    };
  }

  if (assignments.length === 0 && materialCount === 0) {
    return {
      eyebrow: "Set Up",
      title: "Add the first assignment or course material",
      description: "Once this class has real course context, the page can surface the right next study block.",
      meta: "No assignments or materials yet",
      icon: Upload,
      tone: "slate",
      action: { type: "link", label: "Add Context", href: "#materials" },
    };
  }

  const reviewSet = flashcardSets[0];
  if (reviewSet) {
    return {
      eyebrow: "Review",
      title: reviewSet.title,
      description: "No urgent class work is due soon, so this is a good moment for light retrieval practice.",
      meta: `${reviewSet.mastery}% mastery - ${reviewSet.cardCount} cards`,
      icon: Brain,
      tone: "emerald",
      action: {
        type: "study",
        label: "Review Cards",
        title: reviewSet.title,
        classId,
        flashcardSetId: reviewSet.id,
        sessionType: "flashcards",
      },
    };
  }

  return {
    eyebrow: "Caught Up",
    title: "Plan the next study block",
    description: "This class has context, but no immediate study block is scheduled. Open the planner when you want to map out the next step.",
    meta: `${assignments.length} assignment${assignments.length === 1 ? "" : "s"} in this class`,
    icon: CalendarDays,
    tone: "slate",
    action: { type: "link", label: "Open Planner", href: "/planner" },
  };
}

export function getQuickActions(classId: string): QuickAction[] {
  return [
    { label: "Add Assignment", icon: Plus, href: "#materials" },
    { label: "Upload Materials", icon: Upload, href: "#materials" },
    { label: "Create Flashcards", icon: Brain, href: `/study/flashcards/create?classId=${classId}` },
    { label: "Open Planner", icon: CalendarDays, href: "/planner" },
    { label: "Study Tools", icon: Sparkles, href: "/study" },
  ];
}

export function getDueState(assignment: CourseAssignment, classColor: ClassColor) {
  const todayKey = getDateKey();
  const dueDate = assignment.dueDate?.slice(0, 10);
  const colorOption = getClassColor(classColor);
  if (assignment.status === "completed") return { label: "Completed", kind: "completed" as const, cardClass: "", badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700", isUrgent: false };
  if (!dueDate) return { label: "Unscheduled", kind: "scheduled" as const, cardClass: "", badgeClass: `${colorOption.border} ${colorOption.bg} ${colorOption.text}`, isUrgent: false };
  if (dueDate < todayKey) return { label: "Overdue", kind: "urgent" as const, cardClass: "bg-red-50/40", badgeClass: "border-red-200 bg-red-50 text-red-700", isUrgent: true };
  if (dueDate === todayKey) return { label: "Due today", kind: "urgent" as const, cardClass: "bg-amber-50/40", badgeClass: "border-amber-200 bg-amber-50 text-amber-700", isUrgent: true };
  return { label: `Due ${formatShortDate(dueDate)}`, kind: "scheduled" as const, cardClass: "", badgeClass: `${colorOption.border} ${colorOption.bg} ${colorOption.text}`, isUrgent: false };
}

export function formatMaterialCount(count: number) {
  return `${count} material${count === 1 ? "" : "s"}`;
}

export function formatShortDate(value: string | null) {
  if (!value) return "recently";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toFlashcardSet(set: FlashcardSetRow): FlashcardSet {
  const cards = Array.isArray(set.flashcards) ? set.flashcards : [];
  const mastery = cards.length
    ? Math.round(cards.reduce((sum, card) => sum + (card.mastery_level ?? 0), 0) / cards.length)
    : 0;
  return {
    id: set.id,
    title: set.title ?? "Untitled Flashcard Set",
    lastStudied: formatRelativeDate(set.created_at),
    mastery,
    cardCount: cards.length,
    href: `/study/flashcards/${set.id}`,
  };
}

function toAssignmentOption(assignment: AssignmentRow): ClassAssignmentOption {
  return {
    id: assignment.id,
    title: assignment.title ?? "Untitled Assignment",
    dueDate: assignment.due_date,
    hasAssignmentFile: Boolean(assignment.original_file_name),
  };
}

function getAssignmentSummaries(
  assignments: AssignmentRow[],
  materialCounts: Map<string, number>,
) {
  return assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title ?? "Untitled Assignment",
    dueDate: assignment.due_date,
    status: assignment.status ?? "not_started",
    importance: assignment.importance ?? "medium",
    hasAssignmentFile: Boolean(assignment.original_file_name),
    materialCount: (assignment.original_file_name ? 1 : 0) + (materialCounts.get(assignment.id) ?? 0),
    contextStatus: assignment.context_status ?? "missing",
  })).sort(sortCourseAssignments);
}

function getMaterialCountByAssignment(materials: AssignmentMaterialRow[]) {
  const counts = new Map<string, number>();
  materials.forEach((material) => counts.set(material.assignment_id, (counts.get(material.assignment_id) ?? 0) + 1));
  return counts;
}

function buildMaterials(
  assignments: AssignmentRow[],
  assignmentMaterials: AssignmentMaterialRow[],
  notes: NoteRow[],
  assignmentTitleById: Map<string, string>,
): ClassMaterial[] {
  return [
    ...assignments.filter((assignment) => assignment.original_file_name).map((assignment) => ({
      id: `assignment-file-${assignment.id}`,
      title: assignment.original_file_name ?? `${assignment.title ?? "Assignment"} instructions`,
      meta: `${assignment.title ?? "Assignment"} - Instructions - Updated ${formatShortDate(assignment.updated_at ?? assignment.created_at)}`,
      kind: "assignment_file" as const,
    })),
    ...assignmentMaterials.map((material) => ({
      id: material.id,
      title: material.original_file_name ?? "Untitled Material",
      meta: `${assignmentTitleById.get(material.assignment_id) ?? "Assignment"} - Uploaded ${formatShortDate(material.created_at)}`,
      kind: "study_material" as const,
    })),
    ...notes.map((note) => ({
      id: note.id,
      title: note.title ?? "Untitled Material",
      meta: `${(note.source_type ?? "File").toUpperCase()} - Uploaded ${formatShortDate(note.created_at)}`,
      kind: "note" as const,
    })),
  ];
}

function sortCourseAssignments(first: CourseAssignment, second: CourseAssignment) {
  if (first.status === "completed" && second.status !== "completed") return 1;
  if (first.status !== "completed" && second.status === "completed") return -1;
  const firstDate = first.dueDate?.slice(0, 10);
  const secondDate = second.dueDate?.slice(0, 10);
  if (firstDate && secondDate) return firstDate.localeCompare(secondDate);
  if (firstDate) return -1;
  if (secondDate) return 1;
  return first.title.localeCompare(second.title);
}

function getCourseProgress(
  assignments: AssignmentRow[],
  flashcardSets: FlashcardSetRow[],
  studySessions: StudySessionRow[],
): CourseProgress {
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter((assignment) => assignment.status === "completed").length;
  const assignmentPercent = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : null;
  const flashcards = flashcardSets.flatMap((set) => Array.isArray(set.flashcards) ? set.flashcards : []);
  const flashcardCount = flashcards.length;
  const flashcardMasteryPercent = flashcardCount > 0
    ? Math.round(flashcards.reduce((sum, card) => sum + (card.mastery_level ?? 0), 0) / flashcardCount)
    : 0;
  const available = [assignmentPercent, flashcardCount > 0 ? flashcardMasteryPercent : null].filter((value): value is number => value !== null);
  return {
    overallPercent: available.length ? Math.round(available.reduce((sum, value) => sum + value, 0) / available.length) : 0,
    completedAssignments,
    totalAssignments,
    flashcardMasteryPercent,
    flashcardCount,
    studyStreakDays: getStudyStreakDays(studySessions),
  };
}

function getWeekItems(tasks: PlannerTaskRow[], assignments: CourseAssignment[], todayKey: string, weekAheadKey: string) {
  const taskItems: WeekItem[] = tasks.filter((task) => task.status !== "completed" && task.scheduled_date).map((task) => ({
    id: task.id,
    title: task.title ?? "Study Block",
    date: task.scheduled_date!.slice(0, 10),
    kind: "task",
    status: task.status ?? "todo",
  }));
  const assignmentItems: WeekItem[] = assignments.filter((assignment) => {
    const dueDate = assignment.dueDate?.slice(0, 10);
    return assignment.status !== "completed" && Boolean(dueDate) && dueDate! >= todayKey && dueDate! <= weekAheadKey;
  }).map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    date: assignment.dueDate!.slice(0, 10),
    kind: "assignment",
    status: assignment.status,
  }));
  return [...taskItems, ...assignmentItems].sort((a, b) => a.date.localeCompare(b.date));
}

function getStudyStreakDays(studySessions: StudySessionRow[]) {
  const studiedDays = new Set(studySessions.map((session) => getLocalDateKey(session.ended_at)).filter((key): key is string => Boolean(key)));
  if (studiedDays.size === 0) return 0;
  const cursor = new Date();
  const todayKey = getLocalDateKey(cursor.toISOString());
  if (!todayKey || !studiedDays.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
  let streakDays = 0;
  while (studiedDays.has(getLocalDateKey(cursor.toISOString()) ?? "")) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streakDays;
}

function inferTaskSessionType(title: string): StudySessionType {
  const normalized = title.toLowerCase();
  if (normalized.includes("flashcard")) return "flashcards";
  if (normalized.includes("quiz")) return "practice_quiz";
  return "assignment";
}

function emptyWorkspaceData(): ClassWorkspaceData {
  return {
    course: fallbackCourse,
    flashcardSets: [],
    courseProgress: getCourseProgress([], [], []),
    assignments: [],
    assignmentSummaries: [],
    plannerTasks: [],
    activeSession: null,
    materials: [],
    materialCount: 0,
    weekItems: [],
  };
}

function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getLocalDateKey(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : getDateKey(date);
}

function formatRelativeTime(value: string | null) {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return diffHours < 24 ? `${diffHours} hr ago` : formatRelativeDate(value).toLowerCase();
}

function formatRelativeDate(value: string | null) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
