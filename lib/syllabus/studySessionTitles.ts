const DEFAULT_MAX_TASK_TITLE_LENGTH = 120;

export function createAssignmentStudySessionTitle(
  assignmentTitle: string,
  sessionNumber: number,
  totalSessions: number,
  maxLength = DEFAULT_MAX_TASK_TITLE_LENGTH,
) {
  const safeTotal = Math.max(1, Math.floor(totalSessions));
  const safeSessionNumber = Math.min(
    safeTotal,
    Math.max(1, Math.floor(sessionNumber)),
  );
  const prefix = `Study Session ${safeSessionNumber}/${safeTotal}: `;
  const compactTitle =
    assignmentTitle.replace(/\s+/g, " ").trim() || "Assignment";
  const maxAssignmentTitleLength = Math.max(1, maxLength - prefix.length);
  const shortenedTitle =
    compactTitle.length > maxAssignmentTitleLength
      ? `${compactTitle.slice(0, maxAssignmentTitleLength - 3).trim()}...`
      : compactTitle;

  return `${prefix}${shortenedTitle}`;
}

export function getAssignmentStudySessionPercentage(totalSessions: number) {
  return Math.max(1, Math.round(100 / Math.max(1, totalSessions)));
}

export type AssignmentStudySessionGoal = {
  sessionNumber: number;
  totalSessions: number;
  percentage: number;
};

export type AssignmentStudySessionTask = {
  id: string;
};

export function getAssignmentStudySessionGoal(
  tasks: AssignmentStudySessionTask[],
  currentTaskId: string | null | undefined,
): AssignmentStudySessionGoal | null {
  if (!currentTaskId || tasks.length === 0) return null;

  const taskIndex = tasks.findIndex((task) => task.id === currentTaskId);
  if (taskIndex < 0) return null;

  const totalSessions = tasks.length;

  return {
    sessionNumber: taskIndex + 1,
    totalSessions,
    percentage: getAssignmentStudySessionPercentage(totalSessions),
  };
}
