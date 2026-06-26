import {
  createBalancedStudyPlan,
  DEFAULT_MAX_STUDY_TASKS_PER_DAY,
  getAssignmentImportance,
} from "@/lib/syllabus/scheduling";
import { classColorOptions, type ClassColor } from "@/lib/classColors";
import { createClient } from "@/lib/supabase/server";
import type {
  SyllabusAssignment,
  SyllabusAssignmentDifficulty,
  SyllabusDueDateStatus,
  SyllabusItemKind,
} from "@/types/syllabus";

export const runtime = "nodejs";

const MAX_IMPORT_ASSIGNMENTS = 80;
const difficultyValues = new Set<SyllabusAssignmentDifficulty>([
  "easy",
  "medium",
  "hard",
]);
const itemKindValues = new Set<SyllabusItemKind>([
  "assignment",
  "exam",
  "quiz",
]);
const dueDateStatusValues = new Set<SyllabusDueDateStatus>([
  "explicit",
  "inferred",
  "missing",
]);
const classColorValues = new Set<ClassColor>(
  classColorOptions.map((option) => option.value),
);

type ImportPayload = {
  classId?: unknown;
  newClass?: unknown;
  assignments?: unknown;
  planningDate?: unknown;
  maxTasksPerDay?: unknown;
};

type NewClassInput = {
  name: string;
  classCode: string;
  professorName: string;
  color: ClassColor;
};

type CreatedAssignmentSummary = {
  id: string;
  title: string;
  studySessionCount: number;
};

export async function POST(request: Request) {
  let payload: ImportPayload;

  try {
    payload = (await request.json()) as ImportPayload;
  } catch {
    return Response.json(
      { error: "Import reviewed assignments using valid JSON." },
      { status: 400 },
    );
  }

  const requestedClassId =
    typeof payload.classId === "string" ? payload.classId.trim() : "";
  const newClass = normalizeNewClass(payload.newClass);

  if (typeof newClass === "string") {
    return Response.json({ error: newClass }, { status: 400 });
  }

  if ((!requestedClassId && !newClass) || (requestedClassId && newClass)) {
    return Response.json(
      {
        error:
          "Confirm an existing class or approve the detected new class before importing.",
      },
      { status: 400 },
    );
  }

  if (!Array.isArray(payload.assignments) || payload.assignments.length === 0) {
    return Response.json(
      { error: "Review and approve at least one assignment before importing." },
      { status: 400 },
    );
  }

  if (payload.assignments.length > MAX_IMPORT_ASSIGNMENTS) {
    return Response.json(
      { error: `Import ${MAX_IMPORT_ASSIGNMENTS} assignments or fewer at once.` },
      { status: 400 },
    );
  }

  const normalizedAssignments: SyllabusAssignment[] = [];

  for (let index = 0; index < payload.assignments.length; index += 1) {
    const normalized = normalizeReviewedAssignment(
      payload.assignments[index],
      index,
    );

    if (typeof normalized === "string") {
      return Response.json({ error: normalized }, { status: 400 });
    }

    normalizedAssignments.push(normalized);
  }

  const planningDate = resolvePlanningDate(payload.planningDate);
  const maxTasksPerDay = resolveMaxTasksPerDay(payload.maxTasksPerDay);
  const pastDueAssignment = normalizedAssignments.find(
    (assignment) =>
      assignment.dueDate !== null && assignment.dueDate < planningDate,
  );

  if (pastDueAssignment) {
    return Response.json(
      {
        error: `"${pastDueAssignment.title}" is past due. Update its date, clear the date to keep it unscheduled, or remove it before importing.`,
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json(
      { error: "You must be logged in to import assignments." },
      { status: 401 },
    );
  }

  const createdAssignmentIds: string[] = [];
  const createdTaskIds: string[] = [];
  const createdAssignments: CreatedAssignmentSummary[] = [];
  let createdClassId: string | null = null;
  let studySessionCount = 0;

  try {
    const resolvedClass = requestedClassId
      ? await getExistingClass(supabase, user.id, requestedClassId)
      : await createDetectedClass(supabase, user.id, newClass as NewClassInput);

    if (!resolvedClass) {
      return Response.json(
        { error: "The selected class could not be found." },
        { status: 400 },
      );
    }

    if (resolvedClass.created) createdClassId = resolvedClass.id;

    const existingTaskCounts = await getExistingTaskCounts(
      supabase,
      user.id,
      planningDate,
      normalizedAssignments,
    );
    const planItems: Array<{
      itemId: string;
      item: SyllabusAssignment;
    }> = [];

    for (const assignment of normalizedAssignments) {
      const importance = getAssignmentImportance(assignment);
      const { data: createdAssignment, error: assignmentError } = await supabase
        .from("assignments")
        .insert({
          user_id: user.id,
          class_id: resolvedClass.id,
          title: assignment.title,
          description: assignment.notes || null,
          due_date: assignment.dueDate,
          importance,
          points: assignment.points,
          status: "not_started",
        })
        .select("id, title")
        .single();

      if (assignmentError || !createdAssignment) {
        throw new Error(assignmentError?.message ?? "Assignment save failed.");
      }

      createdAssignmentIds.push(createdAssignment.id);
      planItems.push({ itemId: createdAssignment.id, item: assignment });
      createdAssignments.push({
        id: createdAssignment.id,
        title: createdAssignment.title,
        studySessionCount: 0,
      });
    }

    const sessions = createBalancedStudyPlan(planItems, {
      fromDate: planningDate,
      existingTaskCounts,
      maxTasksPerDay,
    });
    const taskRows = sessions.map((session) => ({
      user_id: user.id,
      class_id: resolvedClass.id,
      assignment_id: session.itemId,
      title: session.title,
      priority: session.priority,
      status: "todo",
      scheduled_date: session.scheduledDate,
      source: "generic_generated",
      context_version: 0,
      user_edited: false,
    }));

    if (taskRows.length > 0) {
      const { data: createdTasks, error: taskError } = await supabase
        .from("study_plan_tasks")
        .insert(taskRows)
        .select("id");

      if (taskError || !createdTasks) {
        throw new Error(taskError?.message ?? "Study sessions save failed.");
      }

      createdTaskIds.push(
        ...createdTasks
          .map((task) => task.id)
          .filter((id): id is string => typeof id === "string"),
      );
      studySessionCount = createdTasks.length;
    }

    const sessionCountByAssignment = new Map<string, number>();
    sessions.forEach((session) => {
      sessionCountByAssignment.set(
        session.itemId,
        (sessionCountByAssignment.get(session.itemId) ?? 0) + 1,
      );
    });
    createdAssignments.forEach((assignment) => {
      assignment.studySessionCount =
        sessionCountByAssignment.get(assignment.id) ?? 0;
    });

    return Response.json({
      importedAssignments: createdAssignments,
      assignmentCount: createdAssignments.length,
      studySessionCount,
      classId: resolvedClass.id,
      className: resolvedClass.name,
      classCreated: resolvedClass.created,
    });
  } catch (error) {
    console.error("Syllabus import error:", error);
    await cleanupCreatedRows(
      supabase,
      user.id,
      createdTaskIds,
      createdAssignmentIds,
      createdClassId,
    );

    return Response.json(
      {
        error:
          "The import could not be saved. No syllabus assignments were kept.",
      },
      { status: 500 },
    );
  }
}

function normalizeNewClass(value: unknown): NewClassInput | null | string {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return "The detected class details are invalid.";

  const name = getString(value.name).replace(/\s+/g, " ").trim();
  const classCode = getString(value.classCode).replace(/\s+/g, " ").trim();
  const professorName = getString(value.professorName)
    .replace(/\s+/g, " ")
    .trim();
  const color = normalizeClassColor(value.color);

  if (!name) return "Enter a class name before creating the new class.";
  if (!classCode) return "Enter a course code before creating the new class.";
  if (!professorName) {
    return "Enter the instructor before creating the new class.";
  }
  if (!color) return "Choose a valid class color before creating the new class.";

  return {
    name: name.slice(0, 180),
    classCode: classCode.slice(0, 80),
    professorName: professorName.slice(0, 180),
    color,
  };
}

async function getExistingClass(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  classId: string,
) {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id as string,
    name: typeof data.name === "string" ? data.name : "Untitled class",
    created: false,
  };
}

async function createDetectedClass(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  newClass: NewClassInput,
) {
  const { data, error } = await supabase
    .from("classes")
    .insert({
      user_id: userId,
      name: newClass.name,
      class_code: newClass.classCode,
      prof_name: newClass.professorName,
      color: newClass.color,
    })
    .select("id, name")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Class creation failed.");
  }

  return {
    id: data.id as string,
    name: typeof data.name === "string" ? data.name : newClass.name,
    created: true,
  };
}

function normalizeReviewedAssignment(
  value: unknown,
  index: number,
): SyllabusAssignment | string {
  if (!isRecord(value)) {
    return `Assignment ${index + 1} needs review before import.`;
  }

  const title = getString(value.title).replace(/\s+/g, " ").trim();
  if (!title) return `Assignment ${index + 1} needs a title.`;

  const proposedDueDate = getString(value.dueDate).trim();
  const dueDate = proposedDueDate || null;
  if (dueDate && !isValidDateOnly(dueDate)) {
    return `"${title}" has an invalid due date.`;
  }

  const difficulty = getDifficulty(value.difficulty);
  if (!difficulty) {
    return `"${title}" needs a valid difficulty.`;
  }

  const kind = getItemKind(value.kind);
  if (!kind) {
    return `"${title}" needs a valid item type.`;
  }

  const points = getPoints(value.points);
  if (points === false) {
    return `"${title}" has an invalid point value.`;
  }

  return {
    title: title.slice(0, 180),
    kind,
    dueDate,
    dueDateStatus: dueDate
      ? getDueDateStatus(value.dueDateStatus, "explicit")
      : "missing",
    points,
    difficulty,
    confidence: getConfidence(value.confidence),
    notes: getString(value.notes).replace(/\s+/g, " ").trim().slice(0, 500),
  };
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeClassColor(value: unknown): ClassColor | null {
  if (value === null || value === undefined || value === "") return "blue";
  if (typeof value !== "string") return null;

  return classColorValues.has(value as ClassColor)
    ? (value as ClassColor)
    : null;
}

function getDifficulty(value: unknown): SyllabusAssignmentDifficulty | null {
  if (typeof value !== "string") return null;

  return difficultyValues.has(value as SyllabusAssignmentDifficulty)
    ? (value as SyllabusAssignmentDifficulty)
    : null;
}

function getItemKind(value: unknown): SyllabusItemKind | null {
  if (typeof value !== "string") return null;

  return itemKindValues.has(value as SyllabusItemKind)
    ? (value as SyllabusItemKind)
    : null;
}

function getDueDateStatus(
  value: unknown,
  fallback: SyllabusDueDateStatus,
): SyllabusDueDateStatus {
  if (
    typeof value === "string" &&
    dueDateStatusValues.has(value as SyllabusDueDateStatus)
  ) {
    return value as SyllabusDueDateStatus;
  }

  return fallback;
}

function getPoints(value: unknown): number | null | false {
  if (value === null || value === undefined || value === "") return null;

  const points = typeof value === "number" ? value : Number(value);
  return Number.isFinite(points) && points >= 0 ? points : false;
}

function getConfidence(value: unknown) {
  const confidence = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(confidence)) return 0.5;

  return Math.min(1, Math.max(0, confidence));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function resolvePlanningDate(value: unknown) {
  const serverDate = new Date().toISOString().slice(0, 10);
  const candidate = getString(value).trim();

  if (!isValidDateOnly(candidate)) return serverDate;

  const difference = Math.abs(
    Date.parse(`${candidate}T00:00:00Z`) -
      Date.parse(`${serverDate}T00:00:00Z`),
  );

  return difference <= 86_400_000 ? candidate : serverDate;
}

function resolveMaxTasksPerDay(value: unknown) {
  const candidate = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(candidate) || candidate < 1 || candidate > 5) {
    return DEFAULT_MAX_STUDY_TASKS_PER_DAY;
  }

  return candidate;
}

async function getExistingTaskCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  planningDate: string,
  assignments: SyllabusAssignment[],
) {
  const latestDueDate = assignments.reduce<string | null>(
    (latest, assignment) => {
      if (!assignment.dueDate) return latest;
      return !latest || assignment.dueDate > latest ? assignment.dueDate : latest;
    },
    null,
  );

  if (!latestDueDate) return new Map<string, number>();

  const { data, error } = await supabase
    .from("study_plan_tasks")
    .select("scheduled_date")
    .eq("user_id", userId)
    .neq("status", "completed")
    .gte("scheduled_date", planningDate)
    .lte("scheduled_date", latestDueDate);

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  (data ?? []).forEach((task) => {
    if (typeof task.scheduled_date !== "string") return;
    const date = task.scheduled_date.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  });

  return counts;
}

async function cleanupCreatedRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  taskIds: string[],
  assignmentIds: string[],
  classId: string | null,
) {
  if (taskIds.length > 0) {
    const { error } = await supabase
      .from("study_plan_tasks")
      .delete()
      .eq("user_id", userId)
      .in("id", taskIds);

    if (error) {
      console.error("Could not clean up syllabus study sessions:", error);
    }
  }

  if (assignmentIds.length > 0) {
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("user_id", userId)
      .in("id", assignmentIds);

    if (error) {
      console.error("Could not clean up syllabus assignments:", error);
    }
  }

  if (classId) {
    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("user_id", userId)
      .eq("id", classId);

    if (error) {
      console.error("Could not clean up the detected class:", error);
    }
  }
}
