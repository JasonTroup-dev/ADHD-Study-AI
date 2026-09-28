import type { SyllabusDueDateStatus } from "@/types/syllabus";

export function getSyllabusDateEvidence(
  sourceText: string,
  dateOnly: string,
): SyllabusDueDateStatus {
  const [year, monthNumber, dayNumber] = dateOnly.split("-").map(Number);
  const monthNames = [
    "january|jan\\.?",
    "february|feb\\.?",
    "march|mar\\.?",
    "april|apr\\.?",
    "may",
    "june|jun\\.?",
    "july|jul\\.?",
    "august|aug\\.?",
    "september|sept?\\.?",
    "october|oct\\.?",
    "november|nov\\.?",
    "december|dec\\.?",
  ];
  const monthName = `(?:${monthNames[monthNumber - 1]})`;
  const month = `0?${monthNumber}`;
  const day = `0?${dayNumber}(?:st|nd|rd|th)?`;
  const shortYear = String(year).slice(-2);
  const normalizedSource = sourceText.replace(/\s+/g, " ");
  const explicitPatterns = [
    new RegExp(`\\b${year}[-/.]${month}[-/.]0?${dayNumber}\\b`, "i"),
    new RegExp(
      `\\b${month}[-/.]0?${dayNumber}[-/.](?:${year}|${shortYear})\\b`,
      "i",
    ),
    new RegExp(`\\b${monthName}\\s+${day},?\\s+${year}\\b`, "i"),
    new RegExp(`\\b${day}\\s+${monthName},?\\s+${year}\\b`, "i"),
  ];

  if (explicitPatterns.some((pattern) => pattern.test(normalizedSource))) {
    return "explicit";
  }

  const inferredPatterns = [
    new RegExp(`\\b${monthName}\\s+${day}\\b`, "i"),
    new RegExp(`\\b${day}\\s+${monthName}\\b`, "i"),
    new RegExp(`\\b${month}[-/]0?${dayNumber}\\b`, "i"),
  ];

  return inferredPatterns.some((pattern) => pattern.test(normalizedSource))
    ? "inferred"
    : "missing";
}

export function shouldExcludeUndatedSyllabusItem(
  title: string,
  dueDate: string | null,
) {
  if (dueDate) return false;

  return /\b(?:attendance|class participation|participation and discussions?|participation & discussions?)\b/i.test(
    title,
  );
}
