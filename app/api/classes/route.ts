import { classColorOptions, type ClassColor } from "@/lib/classColors";
import { createClient } from "@/lib/supabase/server";
import type { ClassSummary, CreateClassInput } from "@/types/classes";

const classColorValues = new Set<ClassColor>(
  classColorOptions.map((option) => option.value),
);

type ClassRow = {
  id: string;
  name: string | null;
  created_at: string | null;
  class_code: string | null;
  prof_name: string | null;
  color: string | null;
};

type AssignmentRow = {
  id: string;
  class_id: string | null;
  title: string | null;
  due_date: string | null;
  status: string | null;
};

type ClassRelationRow = {
  id: string;
  class_id: string | null;
};

type FlashcardSetRow = ClassRelationRow & {
  flashcards?: { mastery_level: number | null }[] | null;
};

export async function GET() {
  const auth = await getAuthenticatedClient();
  if (auth instanceof Response) return auth;

  const { supabase, userId } = auth;
  const { data: classRows, error: classesError } = await supabase
    .from("classes")
    .select("id, name, created_at, class_code, prof_name, color")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (classesError) {
    console.error("Classes API could not load classes:", classesError);
    return Response.json(
      { error: "Your classes could not be loaded." },
      { status: 500 },
    );
  }

  const classes = (classRows ?? []) as ClassRow[];
  const classIds = classes.map((classItem) => classItem.id);

  if (classIds.length === 0) {
    return Response.json({ classes: [] satisfies ClassSummary[] });
  }

  const [assignmentsResult, flashcardSetsResult, notesResult, sessionsResult] =
    await Promise.all([
      supabase
        .from("assignments")
        .select("id, class_id, title, due_date, status")
        .eq("user_id", userId)
        .in("class_id", classIds),
      supabase
        .from("flashcard_sets")
        .select("id, class_id, flashcards(mastery_level)")
        .eq("user_id", userId)
        .in("class_id", classIds),
      supabase
        .from("notes")
        .select("id, class_id")
        .eq("user_id", userId)
        .in("class_id", classIds),
      supabase
        .from("study_sessions")
        .select("id, class_id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .in("class_id", classIds),
    ]);

  const relatedError =
    assignmentsResult.error ??
    flashcardSetsResult.error ??
    notesResult.error ??
    sessionsResult.error;

  if (relatedError) {
    console.error("Classes API could not load class summaries:", relatedError);
    return Response.json(
      { error: "Your class summaries could not be loaded." },
      { status: 500 },
    );
  }

  return Response.json({
    classes: buildClassSummaries({
      classes,
      assignments: (assignmentsResult.data ?? []) as AssignmentRow[],
      flashcardSets: (flashcardSetsResult.data ?? []) as FlashcardSetRow[],
      notes: (notesResult.data ?? []) as ClassRelationRow[],
      sessions: (sessionsResult.data ?? []) as ClassRelationRow[],
    }),
  });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Create a class using valid JSON." },
      { status: 400 },
    );
  }

  const normalizedClass = normalizeCreateClassInput(payload);
  if (typeof normalizedClass === "string") {
    return Response.json({ error: normalizedClass }, { status: 400 });
  }

  const auth = await getAuthenticatedClient();
  if (auth instanceof Response) return auth;

  const { data, error } = await auth.supabase
    .from("classes")
    .insert({
      user_id: auth.userId,
      name: normalizedClass.name,
      class_code: normalizedClass.classCode,
      prof_name: normalizedClass.professorName,
      color: normalizedClass.color,
    })
    .select("id, name, created_at, class_code, prof_name, color")
    .single();

  if (error || !data) {
    console.error("Classes API could not create a class:", error);
    return Response.json(
      { error: "The class could not be created." },
      { status: 500 },
    );
  }

  return Response.json(
    { class: buildEmptyClassSummary(data as ClassRow) },
    { status: 201 },
  );
}

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return Response.json(
      { error: "You must be logged in to manage classes." },
      { status: 401 },
    );
  }

  return { supabase, userId: user.id };
}

function buildClassSummaries({
  classes,
  assignments,
  flashcardSets,
  notes,
  sessions,
}: {
  classes: ClassRow[];
  assignments: AssignmentRow[];
  flashcardSets: FlashcardSetRow[];
  notes: ClassRelationRow[];
  sessions: ClassRelationRow[];
}) {
  const assignmentsByClass = groupByClass(assignments);
  const flashcardSetCountByClass = countByClass(flashcardSets);
  const noteCountByClass = countByClass(notes);
  const sessionCountByClass = countByClass(sessions);

  return classes.map((classItem): ClassSummary => {
    const classAssignments = assignmentsByClass.get(classItem.id) ?? [];
    const completedAssignmentCount = classAssignments.filter(
      (assignment) => assignment.status === "completed",
    ).length;
    const assignmentProgress = classAssignments.length
      ? Math.round(
          (completedAssignmentCount / classAssignments.length) * 100,
        )
      : null;
    const classFlashcardSets = flashcardSets.filter(
      (set) => set.class_id === classItem.id,
    );
    const flashcards = classFlashcardSets.flatMap((set) =>
      Array.isArray(set.flashcards) ? set.flashcards : [],
    );
    const flashcardProgress = flashcards.length
      ? Math.round(
          flashcards.reduce(
            (total, flashcard) => total + (flashcard.mastery_level ?? 0),
            0,
          ) / flashcards.length,
        )
      : null;
    const availableProgress = [assignmentProgress, flashcardProgress].filter(
      (value): value is number => value !== null,
    );
    const nextAssignment = [...classAssignments]
      .filter((assignment) => assignment.status !== "completed")
      .sort(compareAssignments)[0];

    return {
      ...buildEmptyClassSummary(classItem),
      nextAssignment: nextAssignment
        ? {
            id: nextAssignment.id,
            title: nextAssignment.title ?? "Untitled assignment",
            dueDate: nextAssignment.due_date,
          }
        : null,
      progressPercent: availableProgress.length
        ? Math.round(
            availableProgress.reduce((total, value) => total + value, 0) /
              availableProgress.length,
          )
        : 0,
      flashcardSetCount: flashcardSetCountByClass.get(classItem.id) ?? 0,
      noteCount: noteCountByClass.get(classItem.id) ?? 0,
      sessionCount: sessionCountByClass.get(classItem.id) ?? 0,
    };
  });
}

function buildEmptyClassSummary(classItem: ClassRow): ClassSummary {
  return {
    id: classItem.id,
    name: classItem.name?.trim() || "Untitled class",
    createdAt: classItem.created_at ?? new Date().toISOString(),
    classCode: classItem.class_code?.trim() || "No course code",
    professorName: classItem.prof_name?.trim() || "No instructor",
    color: isClassColor(classItem.color) ? classItem.color : "blue",
    nextAssignment: null,
    progressPercent: 0,
    flashcardSetCount: 0,
    noteCount: 0,
    sessionCount: 0,
  };
}

function normalizeCreateClassInput(value: unknown): CreateClassInput | string {
  if (!isRecord(value)) return "Enter the class details before creating it.";

  const name = normalizeText(value.name);
  const classCode = normalizeText(value.classCode);
  const professorName = normalizeText(value.professorName);
  const color = value.color;

  if (!name) return "Enter a class name.";
  if (!classCode) return "Enter a course code.";
  if (!professorName) return "Enter an instructor.";
  if (!isClassColor(color)) return "Choose a valid class color.";

  return {
    name: name.slice(0, 180),
    classCode: classCode.slice(0, 80),
    professorName: professorName.slice(0, 180),
    color,
  };
}

function groupByClass(rows: AssignmentRow[]) {
  const grouped = new Map<string, AssignmentRow[]>();

  rows.forEach((row) => {
    if (!row.class_id) return;
    const classRows = grouped.get(row.class_id) ?? [];
    classRows.push(row);
    grouped.set(row.class_id, classRows);
  });

  return grouped;
}

function countByClass(rows: ClassRelationRow[]) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    if (!row.class_id) return;
    counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1);
  });

  return counts;
}

function compareAssignments(left: AssignmentRow, right: AssignmentRow) {
  if (left.due_date && right.due_date) {
    return left.due_date.localeCompare(right.due_date);
  }
  if (left.due_date) return -1;
  if (right.due_date) return 1;
  return left.title?.localeCompare(right.title ?? "") ?? 0;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function isClassColor(value: unknown): value is ClassColor {
  return (
    typeof value === "string" && classColorValues.has(value as ClassColor)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
