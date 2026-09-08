import type { DashboardInitialData } from "@/app/(app)/dashboard/dashboardData";
import type { TaskDetailsData } from "@/components/tasks/TaskDetailsView";
import type { StudyTask } from "@/components/ui/taskCard";
import type { ClassColor } from "@/lib/classColors";
import type { ClassWorkspaceData } from "@/lib/classes/classWorkspace";
import type { ClassSummary } from "@/types/classes";

export const demoDate = new Date(2026, 9, 13);

export const demoClasses: ClassSummary[] = [
  {
    id: "demo-bio-210",
    name: "Cellular Biology",
    classCode: "BIO 210",
    professorName: "Dr. Maya Patel",
    color: "green",
    createdAt: "2026-08-24T00:00:00.000Z",
    nextAssignment: {
      id: "demo-assignment-lab-report",
      title: "Membrane transport lab report",
      dueDate: "2026-10-16",
    },
    progressPercent: 68,
    flashcardSetCount: 4,
    noteCount: 8,
    sessionCount: 12,
  },
  {
    id: "demo-psy-240",
    name: "Cognitive Psychology",
    classCode: "PSY 240",
    professorName: "Prof. Elena Brooks",
    color: "purple",
    createdAt: "2026-08-24T00:00:00.000Z",
    nextAssignment: {
      id: "demo-assignment-reflection",
      title: "Working memory reflection",
      dueDate: "2026-10-18",
    },
    progressPercent: 54,
    flashcardSetCount: 3,
    noteCount: 6,
    sessionCount: 9,
  },
  {
    id: "demo-hist-115",
    name: "Modern World History",
    classCode: "HIST 115",
    professorName: "Dr. Daniel Okafor",
    color: "orange",
    createdAt: "2026-08-24T00:00:00.000Z",
    nextAssignment: {
      id: "demo-assignment-annotation",
      title: "Primary source annotation",
      dueDate: "2026-10-20",
    },
    progressPercent: 76,
    flashcardSetCount: 2,
    noteCount: 11,
    sessionCount: 15,
  },
];

export const demoTasks: StudyTask[] = [
  {
    id: "demo-task-outline",
    class_id: "demo-bio-210",
    assignment_id: "demo-assignment-lab-report",
    title: "Outline the membrane transport discussion",
    priority: "high",
    status: "todo",
    scheduled_date: "2026-10-13",
    classes: { name: "BIO 210", color: "green" },
  },
  {
    id: "demo-task-flashcards",
    class_id: "demo-psy-240",
    assignment_id: "demo-assignment-reflection",
    title: "Review working memory flashcards",
    priority: "medium",
    status: "todo",
    scheduled_date: "2026-10-13",
    classes: { name: "PSY 240", color: "purple" },
  },
  {
    id: "demo-task-annotation",
    class_id: "demo-hist-115",
    assignment_id: "demo-assignment-annotation",
    title: "Annotate the factory testimony excerpt",
    priority: "medium",
    status: "completed",
    scheduled_date: "2026-10-13",
    classes: { name: "HIST 115", color: "orange" },
  },
];

export const demoDashboardData: DashboardInitialData = {
  userId: "demo-user",
  dateString: "2026-10-13",
  formattedDate: "Tuesday, October 13",
  classes: demoClasses.map(({ id, name }) => ({ id, name })),
  tasks: demoTasks,
  activeStudySession: null,
  upcomingAssignments: [
    {
      id: "demo-assignment-lab-report",
      title: "Membrane transport lab report",
      due_date: "2026-10-16",
      importance: "high",
      points: 100,
      classes: { name: "BIO 210" },
    },
  ],
  todayStudyMinutes: 20,
  todayStudySessionCount: 1,
  studyError: null,
};

export const demoCalendarItems = [
  ...demoTasks.map((task) => ({
    id: task.id,
    title: task.title,
    date: task.scheduled_date,
    isComplete: task.status === "completed",
    kind: "task" as const,
    className: Array.isArray(task.classes)
      ? task.classes[0]?.name ?? "No class"
      : task.classes?.name ?? "No class",
    classColor: (Array.isArray(task.classes)
      ? task.classes[0]?.color ?? null
      : task.classes?.color ?? null) as ClassColor | null,
  })),
  {
    id: "demo-assignment-lab-report",
    title: "Membrane transport lab report",
    date: "2026-10-16",
    isComplete: false,
    kind: "assignment",
    className: "BIO 210",
    classColor: "green" as ClassColor,
  },
  {
    id: "demo-assignment-reflection",
    title: "Working memory reflection",
    date: "2026-10-18",
    isComplete: false,
    kind: "assignment",
    className: "PSY 240",
    classColor: "purple" as ClassColor,
  },
] satisfies Array<{
  id: string;
  title: string;
  date: string;
  isComplete: boolean;
  kind: "task" | "assignment";
  className: string;
  classColor: ClassColor | null;
}>;

const demoTaskAssignmentContent: Record<
  string,
  { originalFileName: string; extractedText: string }
> = {
  "demo-task-outline": {
    originalFileName: "membrane-transport-lab-rubric.pdf",
    extractedText:
      "Draft a focused discussion that compares passive and active membrane transport using observations from the lab. Connect the results to concentration gradients, transport proteins, and cellular energy use, then address one limitation in the experimental design.",
  },
  "demo-task-flashcards": {
    originalFileName: "working-memory-reflection.pdf",
    extractedText:
      "Review the working memory model and identify how the phonological loop, visuospatial sketchpad, and central executive interact. Use the review to prepare a short reflection connecting one model component to an everyday learning strategy.",
  },
  "demo-task-annotation": {
    originalFileName: "factory-testimony-source.pdf",
    extractedText:
      "Annotate the primary source for claims about factory conditions, working hours, and worker agency. Mark two passages that reveal the author’s perspective and add a brief note explaining the historical context of each passage.",
  },
};

export function getDemoTaskDetailsData(taskId: string): TaskDetailsData | null {
  const task = demoTasks.find((item) => item.id === taskId);
  if (!task) return null;

  const classItem = demoClasses.find((item) => item.id === task.class_id);
  const assignment = classItem?.nextAssignment;
  const assignmentContent = demoTaskAssignmentContent[task.id];
  const taskClass = Array.isArray(task.classes) ? task.classes[0] ?? null : task.classes;

  return {
    id: task.id,
    classId: task.class_id,
    assignmentId: task.assignment_id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    scheduledDate: task.scheduled_date,
    studySessionId: null,
    taskClass,
    assignment: assignment
      ? {
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.dueDate,
          originalFileName: assignmentContent?.originalFileName ?? null,
          extractedText: assignmentContent?.extractedText ?? null,
          supportingMaterials: [],
        }
      : null,
  };
}

export function getDemoClassWorkspaceData(
  classId: string,
): ClassWorkspaceData | null {
  const classItem = demoClasses.find((item) => item.id === classId);
  if (!classItem) return null;

  const relatedTasks = demoTasks.filter((task) => task.class_id === classId);
  const nextAssignment = classItem.nextAssignment;
  const assignmentId = nextAssignment?.id ?? `${classId}-assignment`;
  const assignmentTitle = nextAssignment?.title ?? "Course review";
  const dueDate = nextAssignment?.dueDate ?? "2026-10-20";

  return {
    course: {
      name: classItem.name,
      code: classItem.classCode,
      instructor: classItem.professorName,
      color: classItem.color,
    },
    flashcardSets: [
      {
        id: `${classId}-flashcards-1`,
        title: `${classItem.classCode} Core Concepts`,
        lastStudied: "Yesterday",
        mastery: 72,
        cardCount: 24,
        href: "#flashcards",
      },
      {
        id: `${classId}-flashcards-2`,
        title: "Upcoming Exam Review",
        lastStudied: "3 days ago",
        mastery: 58,
        cardCount: 18,
        href: "#flashcards",
      },
    ],
    materials: [
      {
        id: `${classId}-material-1`,
        title: `${assignmentTitle} instructions.pdf`,
        meta: `${assignmentTitle} - Instructions - Updated Oct 10`,
        kind: "assignment_file",
        previewUrl: null,
      },
      {
        id: `${classId}-material-2`,
        title: "Week 7 lecture notes.pdf",
        meta: "PDF - Uploaded Oct 9",
        kind: "note",
        previewUrl: null,
      },
      {
        id: `${classId}-material-3`,
        title: "Review rubric.pdf",
        meta: `${assignmentTitle} - Uploaded Oct 11`,
        kind: "study_material",
        previewUrl: null,
      },
    ],
    materialCount: 3,
    assignments: [
      {
        id: assignmentId,
        title: assignmentTitle,
        dueDate,
        hasAssignmentFile: true,
      },
    ],
    assignmentSummaries: [
      {
        id: assignmentId,
        title: assignmentTitle,
        dueDate,
        status: "in_progress",
        importance: "high",
        hasAssignmentFile: true,
        materialCount: 2,
        contextStatus: "ready",
      },
      {
        id: `${classId}-assignment-complete`,
        title: "Chapter 6 concept check",
        dueDate: "2026-10-09",
        status: "completed",
        importance: "medium",
        hasAssignmentFile: true,
        materialCount: 1,
        contextStatus: "ready",
      },
    ],
    plannerTasks: relatedTasks.map((task) => ({
      id: task.id,
      assignment_id: task.assignment_id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      scheduled_date: task.scheduled_date,
    })),
    activeSession: null,
    courseProgress: {
      overallPercent: classItem.progressPercent,
      completedAssignments: 1,
      totalAssignments: 2,
      flashcardMasteryPercent: 65,
      flashcardCount: 42,
      studyStreakDays: 4,
    },
    weekItems: [
      ...relatedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        date: task.scheduled_date,
        kind: "task" as const,
        status: task.status,
      })),
      {
        id: assignmentId,
        title: assignmentTitle,
        date: dueDate,
        kind: "assignment",
        status: "in_progress",
      },
    ],
  };
}
