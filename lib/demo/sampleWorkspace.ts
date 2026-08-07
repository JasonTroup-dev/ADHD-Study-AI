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
  source: string;
  nextStep: string;
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
    id: "defensible-claim",
    label: "What claim can I defend with my osmosis results?",
    response:
      "Your data supports this claim: as sucrose concentration increased, the potato cores shifted from gaining mass to losing mass, which is consistent with water moving toward the higher solute concentration. Lead with that pattern, then cite the +8.4% change at 0.0 M and the -11.2% change at 0.6 M as your clearest contrast.",
    source: "Used: osmosis-results.csv · all 7 concentrations",
    nextStep: "Next: explain why the percent change crosses zero near the isotonic point.",
  },
  {
    id: "isotonic-point",
    label: "Where is the isotonic point, and how confident should I be?",
    response:
      "The sign changes between 0.2 M (+2.1%) and 0.3 M (-1.4%). A simple linear interpolation puts the isotonic point at about 0.26 M. Report that as an estimate—not an exact measurement—because the experiment has only one concentration step on either side and the variation across trials still matters.",
    source: "Calculated from: 0.2 M and 0.3 M result rows",
    nextStep: "Suggested wording: “The isotonic concentration was approximately 0.26 M.”",
  },
  {
    id: "challenge-conclusion",
    label: "What is the weakest part of my conclusion?",
    response:
      "The sentence “active transport moved water out of the cells” goes beyond your evidence. The mass changes support osmosis, which is passive, but this experiment did not measure energy use or specific membrane proteins. Replace that sentence with a claim about net water movement and name unequal core size as a limitation.",
    source: "Compared: draft-conclusion.md · discussion rubric",
    nextStep: "Revision focus: separate what the data shows from the mechanism it cannot prove.",
  },
];

export const demoHighlights = [
  "A clear next action instead of an empty dashboard",
  "Course context carried into planning and tutoring",
  "AI output reviewed before anything is saved",
] as const;
