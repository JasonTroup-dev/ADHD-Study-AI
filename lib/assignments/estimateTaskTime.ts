type TaskEstimateInput = {
  taskTitle: string;
  assignmentFileName: string | null;
  extractedText: string | null;
};

/**
 * Produces a deliberately broad focus-time estimate from the readable
 * assignment brief. A filename by itself is not enough evidence to estimate.
 */
export function estimateTaskMinutes({
  taskTitle,
  assignmentFileName,
  extractedText,
}: TaskEstimateInput) {
  if (!assignmentFileName || !extractedText?.trim()) return null;

  const text = extractedText.trim();
  const wordCount = text.split(/\s+/).length;
  const requirementSignals = (
    text.match(
      /\b(?:analy[sz]e|argument|citation|cite|compare|data|evidence|experiment|page|problem|question|research|source)\b/gi,
    ) ?? []
  ).length;

  let minutes = 20 + Math.ceil(wordCount / 300) * 10;
  minutes += Math.min(30, requirementSignals * 3);

  if (/\b(?:read|review|skim)\b/i.test(taskTitle)) minutes *= 0.7;
  if (/\b(?:outline|plan|brainstorm)\b/i.test(taskTitle)) minutes *= 0.8;
  if (/\b(?:draft|write|solve|analy[sz]e|complete)\b/i.test(taskTitle)) {
    minutes *= 1.15;
  }

  return Math.min(120, Math.max(15, Math.round(minutes / 5) * 5));
}
