import type { SyllabusDueDateStatus } from "@/types/syllabus";

const normalizeEvidence = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function getAssignmentDateEvidence(sourceText: string, title: string, date: string, proposedQuote?: string | null) {
  const normalizedSource = sourceText.replace(/\s+/g, " ").trim();
  const quote = proposedQuote?.replace(/\s+/g, " ").trim();
  const titleKey = normalizeEvidence(title);
  // A date elsewhere in the syllabus cannot verify this assignment's deadline.
  const lines = sourceText.split(/\r?\n/);
  const matchingLine = lines.findIndex(line => titleKey.length > 0 && normalizeEvidence(line).includes(titleKey));
  const titleLine = matchingLine >= 0 ? lines[matchingLine] : null;
  const continuation = matchingLine >= 0 && /^\s*(?:due|deadline)\b/i.test(lines[matchingLine + 1] ?? "") ? lines[matchingLine + 1] : "";
  const passage = titleLine
    ? `${titleLine} ${continuation}`.trim()
    : quote && quote.length <= 500 && normalizedSource.includes(quote) && normalizeEvidence(quote).includes(titleKey) ? quote : null;
  if (!passage || !titleKey) return { status: "missing" as const, quote: null };
  return { status: getSyllabusDateEvidence(passage, date), quote: passage.slice(0, 1500) };
}

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

  const conflictingYear = [
    new RegExp(`\\b${monthName}\\s+${day},?\\s+(\\d{4})\\b`, "i"),
    new RegExp(`\\b${day}\\s+${monthName},?\\s+(\\d{4})\\b`, "i"),
    new RegExp(`\\b${month}[-/]0?${dayNumber}[-/](\\d{4}|\\d{2})\\b`, "i"),
  ].some(pattern => { const match = normalizedSource.match(pattern); return match && ![String(year), shortYear].includes(match[1]); });
  if (conflictingYear) return "missing";

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
