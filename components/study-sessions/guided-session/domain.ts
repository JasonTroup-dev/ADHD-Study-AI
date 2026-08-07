import type { AssignmentSessionContext, TutorMessage } from "./types";

export function createMissingContextMessage(
  title: string,
  description: string | null,
  studySessionGoal: AssignmentSessionContext["studySessionGoal"],
): TutorMessage {
  const goalLine = studySessionGoal
    ? `For this study session, aim to complete about **${studySessionGoal.percentage}%** of the assignment — session **${studySessionGoal.sessionNumber}/${studySessionGoal.totalSessions}**.`
    : null;
  return {
    id: `missing-context-${crypto.randomUUID()}`,
    role: "assistant",
    content: [
      "### I need a little more context",
      goalLine,
      description
        ? `I have the title **${title}** and its brief description, but not the full assignment requirements.`
        : `I only know the title **${title}**, so I do not know the assignment's exact requirements yet.`,
      "You can upload the assignment for tailored guidance, add study materials as references, or describe the specific problem or part you are stuck on and I can help from your description.",
    ].filter(Boolean).join("\n\n"),
  };
}

export function getReadyCompletion(messages: TutorMessage[]) {
  return [...messages].reverse().find(
    (message) => message.role === "assistant" && message.completionStatus === "ready",
  ) ?? null;
}

export function formatPlanDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
