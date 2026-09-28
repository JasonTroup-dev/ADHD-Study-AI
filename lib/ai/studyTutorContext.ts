export const MAX_STUDY_TUTOR_MESSAGES = 40;

// Keep the initial scope as well as recent work, including after saving/resuming.
export function retainStudyTutorMessages<T>(messages: T[]): T[] {
  if (messages.length <= MAX_STUDY_TUTOR_MESSAGES) return messages;
  return [...messages.slice(0, 4), ...messages.slice(-(MAX_STUDY_TUTOR_MESSAGES - 4))];
}

type Material = { name: string; content: string };

export type AssignmentProblemIndexEntry = {
  assignmentPosition: number;
  primaryLabel: string;
  textbookProblem: string;
  secondaryLabel: string;
  sources: string[];
};

export function buildAssignmentProblemIndex(materials: Material[]) {
  const entries = new Map<string, AssignmentProblemIndexEntry>();
  for (const material of materials) {
    // Only use an explicit association in the source; never equate chapter
    // numbers or upload order with the assignment's question order.
    const positions = [...material.content.matchAll(/Assignment position:\s*(\d+)\s+of\s+\d+/gi)];
    const labels = [...material.content.matchAll(/Displayed problem identifier:\s*(Problem\s+\d+(?:\.\d+)*)/gi)];
    if (positions.length !== 1 || labels.length !== 1) continue;
    const assignmentPosition = Number(positions[0][1]);
    const textbookProblem = labels[0][1];
    const key = `${assignmentPosition}:${textbookProblem}`;
    const entry = entries.get(key) ?? {
      assignmentPosition,
      primaryLabel: `Problem ${assignmentPosition}`,
      textbookProblem,
      secondaryLabel: `textbook ${textbookProblem}`,
      sources: [],
    };
    entry.sources.push(material.name);
    entries.set(key, entry);
  }
  // Preserve conflicting mappings so the tutor can ask, instead of silently
  // choosing one. Unmapped sources remain available in the full materials.
  return [...entries.values()].sort((a, b) => a.assignmentPosition - b.assignmentPosition);
}

export function applyAssignmentProblemLabels(
  message: string,
  problemIndex: AssignmentProblemIndexEntry[],
) {
  const unambiguousIndex = problemIndex.filter((entry) =>
    problemIndex.filter((candidate) =>
      candidate.assignmentPosition === entry.assignmentPosition
    ).length === 1
    && problemIndex.filter((candidate) =>
      candidate.textbookProblem.toLocaleLowerCase()
        === entry.textbookProblem.toLocaleLowerCase()
    ).length === 1
  );
  const byTextbookProblem = new Map(unambiguousIndex.map((entry) => [
    entry.textbookProblem.toLowerCase().replace(/\s+/g, " "), entry,
  ]));
  const usedSecondaryLabels = new Set<number>();

  // Match complete identifiers in one pass. Replacing each index entry in turn
  // let Problem 3.3 corrupt Problem 3.34 and could rewrite our own replacements.
  return replaceTextbookProblemRanges(message, unambiguousIndex).replace(
    /\b(?:assignment\s+(?:position|item)\s*(\d+)\s*(?:\/|[-–—:])\s*)?(?:textbook\s+)?(Problem\s+\d+(?:\.\d+)*)(?![\w]|\.\d)|\bassignment\s+(?:position|item)\s*(\d+)\b/gi,
    (match, combinedPosition: string | undefined, textbookProblem: string | undefined, position: string | undefined, offset: number, source: string) => {
      if (position) {
        return unambiguousIndex.find((entry) => entry.assignmentPosition === Number(position))?.primaryLabel ?? match;
      }
      if (!textbookProblem) return match;
      const entry = byTextbookProblem.get(textbookProblem.toLowerCase().replace(/\s+/g, " "));
      if (!entry || (combinedPosition && Number(combinedPosition) !== entry.assignmentPosition)) return match;

      const followsPrimaryLabel = new RegExp(
        `\\b${escapeRegExp(entry.primaryLabel)}\\s*\\(\\s*$`, "i",
      ).test(source.slice(0, offset));
      if (followsPrimaryLabel) {
        usedSecondaryLabels.add(entry.assignmentPosition);
        return entry.secondaryLabel;
      }
      if (usedSecondaryLabels.has(entry.assignmentPosition)) return entry.primaryLabel;
      usedSecondaryLabels.add(entry.assignmentPosition);
      return `${entry.primaryLabel} (${entry.secondaryLabel})`;
    },
  );
}

function replaceTextbookProblemRanges(
  message: string,
  problemIndex: AssignmentProblemIndexEntry[],
) {
  const positions = new Map(problemIndex.map((entry) => [
    entry.textbookProblem.replace(/^Problem\s+/i, ""),
    entry.assignmentPosition,
  ]));

  return message.replace(
    /\bProblems?\s+(\d+(?:\.\d+)+)\s*[-–—]\s*(\d+(?:\.\d+)+)(?![\w]|\.\d)/gi,
    (match, first: string, last: string) => {
      const firstPosition = positions.get(first);
      const lastPosition = positions.get(last);
      return firstPosition && lastPosition
        ? `Problems ${firstPosition}–${lastPosition}`
        : match;
    },
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function prepareCompletedSessionContext(sessions: Array<{
  title: string | null;
  ended_at: string | null;
  messages: unknown;
}>) {
  return sessions.map((session) => {
    const messages = Array.isArray(session.messages)
      ? session.messages.flatMap((message): Array<{ role: "user" | "assistant"; content: string }> => {
          if (!message || typeof message !== "object"
            || (message.role !== "user" && message.role !== "assistant")
            || typeof message.content !== "string" || !message.content.trim()) return [];
          return [{ role: message.role, content: message.content.slice(0, 1_000) }];
        })
      : [];
    return {
      title: session.title,
      completedAt: session.ended_at,
      // Excerpts are evidence of prior work, not a claim that every planned
      // problem was solved or that earlier assistant answers were correct.
      conversationExcerpts: messages.length > 6
        ? [...messages.slice(0, 2), ...messages.slice(-4)]
        : messages,
    };
  });
}
