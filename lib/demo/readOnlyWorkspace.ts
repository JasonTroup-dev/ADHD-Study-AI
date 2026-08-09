import type { DashboardInitialData } from "@/app/(app)/dashboard/dashboardData";
import type { StudyTask } from "@/components/ui/taskCard";
import type { ClassColor } from "@/lib/classColors";
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
