export type DemoSection = "today" | "classes" | "tutor";

export type DemoClass = {
  code: string;
  name: string;
  professor: string;
  accent: string;
  softAccent: string;
  progress: number;
  nextAssignment: string;
  dueLabel: string;
};

export type DemoTask = {
  id: string;
  title: string;
  course: string;
  minutes: number;
  priority: "High" | "Medium" | "Low";
  completed: boolean;
};

export type DemoTutorPrompt = {
  id: string;
  label: string;
  response: string;
};

export const demoClasses: DemoClass[] = [
  {
    code: "BIO 210",
    name: "Cellular Biology",
    professor: "Dr. Maya Patel",
    accent: "bg-emerald-600",
    softAccent: "bg-emerald-50 text-emerald-800",
    progress: 68,
    nextAssignment: "Membrane transport lab report",
    dueLabel: "Due Friday",
  },
  {
    code: "PSY 240",
    name: "Cognitive Psychology",
    professor: "Prof. Elena Brooks",
    accent: "bg-violet-600",
    softAccent: "bg-violet-50 text-violet-800",
    progress: 54,
    nextAssignment: "Working memory reflection",
    dueLabel: "Due in 5 days",
  },
  {
    code: "HIST 115",
    name: "Modern World History",
    professor: "Dr. Daniel Okafor",
    accent: "bg-amber-500",
    softAccent: "bg-amber-50 text-amber-900",
    progress: 76,
    nextAssignment: "Primary source annotation",
    dueLabel: "Due next week",
  },
];

export const demoTasks: DemoTask[] = [
  {
    id: "task-1",
    title: "Outline the membrane transport discussion",
    course: "BIO 210",
    minutes: 25,
    priority: "High",
    completed: false,
  },
  {
    id: "task-2",
    title: "Review working memory flashcards",
    course: "PSY 240",
    minutes: 15,
    priority: "Medium",
    completed: false,
  },
  {
    id: "task-3",
    title: "Annotate the factory testimony excerpt",
    course: "HIST 115",
    minutes: 20,
    priority: "Medium",
    completed: true,
  },
];

export const demoTutorPrompts: DemoTutorPrompt[] = [
  {
    id: "next-step",
    label: "What should I do first?",
    response:
      "Start with one small target: write a two-sentence claim explaining why water moved into the cell. Then check it against the concentration diagram in your lab notes. You do not need to draft the whole discussion yet.",
  },
  {
    id: "explain-osmosis",
    label: "Explain osmosis simply",
    response:
      "Osmosis is water moving across a membrane toward the side with more dissolved particles. Think of water as trying to balance the concentration on both sides. In your lab, that predicts which cells gain or lose mass.",
  },
  {
    id: "check-claim",
    label: "Help me check my claim",
    response:
      "Use this three-part check: does the claim name the direction water moved, connect that movement to solute concentration, and match the mass change in your results? If all three are present, your claim is ready for evidence.",
  },
];

export const demoHighlights = [
  "A clear next action instead of an empty dashboard",
  "Course context carried into planning and tutoring",
  "AI output reviewed before anything is saved",
] as const;
