export type AssignmentOverviewSource = {
  name: string;
  text: string | null;
};

export function getTaskOverview(input: {
  taskTitle: string;
  primaryFileName: string | null;
  primaryText: string | null;
  supportingMaterials: AssignmentOverviewSource[];
}) {
  const sources = [
    ...input.supportingMaterials.filter(
      (material): material is { name: string; text: string } =>
        Boolean(material.text?.trim()),
    ),
    ...(input.primaryText?.trim()
      ? [{
          name: input.primaryFileName ?? "the assignment instructions",
          text: input.primaryText,
        }]
      : []),
  ];
  const source = getMostRelevantSource(input.taskTitle, sources);

  if (source) {
    const excerpt = getAssignmentExcerpt(source.text);
    return `Focus on ${input.taskTitle}. Based on ${source.name}: ${excerpt}`;
  }

  const hasAttachedMaterial = Boolean(
    input.primaryFileName || input.supportingMaterials.length,
  );
  if (hasAttachedMaterial) {
    return "The attached assignment material has not been read yet. Analyze the images from the assignment page, then return to this task for an accurate overview.";
  }

  return "There isn’t enough detail to provide an accurate overview yet. Upload the assignment instructions or supporting materials so this task can be based on the actual work.";
}

function getMostRelevantSource(
  taskTitle: string,
  sources: Array<{ name: string; text: string }>,
) {
  const titleTerms = Array.from(new Set(
    taskTitle.toLowerCase().match(/[a-z]{3,}|\d+/g) ?? [],
  )).filter((term) => !TASK_TITLE_STOP_WORDS.has(term));

  return sources.reduce<{
    source: { name: string; text: string } | undefined;
    score: number;
  }>((best, source) => {
    const searchableText = `${source.name}\n${source.text}`.toLowerCase();
    const score = titleTerms.reduce(
      (total, term) => total + (searchableText.includes(term)
        ? /^\d+$/.test(term) ? 3 : 1
        : 0),
      0,
    );
    return score > best.score ? { source, score } : best;
  }, { source: sources[0], score: -1 }).source;
}

const TASK_TITLE_STOP_WORDS = new Set([
  "and",
  "assignment",
  "complete",
  "finish",
  "from",
  "problems",
  "questions",
  "review",
  "task",
  "the",
  "work",
]);

function getAssignmentExcerpt(extractedText: string) {
  const normalizedText = extractedText.replace(/\s+/g, " ").trim();
  const sentences = normalizedText
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length >= 30);
  const excerpt = (sentences.slice(0, 2).join(" ") || normalizedText).trim();

  if (excerpt.length <= 420) return excerpt;

  const shortenedExcerpt = excerpt.slice(0, 417);
  const lastSpaceIndex = shortenedExcerpt.lastIndexOf(" ");
  return `${shortenedExcerpt.slice(0, lastSpaceIndex > 300 ? lastSpaceIndex : 417)}…`;
}
