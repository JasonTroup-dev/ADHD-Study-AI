import { normalizeExtractedText } from "@/lib/files/extractTextFromFile";

export const DIRECT_QUIZ_SOURCE_CHARS = 24_000;
export const QUIZ_ANALYSIS_CHUNK_CHARS = 14_000;
export const MAX_QUIZ_ANALYSIS_CHUNKS = 8;

export type PracticeQuizSourceChunk = {
  label: string;
  text: string;
};

export type PreparedPracticeQuizSource = {
  chunks: PracticeQuizSourceChunk[];
  originalCharacterCount: number;
  analyzedCharacterCount: number;
  usesConceptPass: boolean;
};

/**
 * Small sources can go straight to question generation. Larger sources are
 * divided across the full document for a concept pass first. Extremely large
 * sources are sampled at evenly spaced points, so the middle is not silently
 * discarded and students do not have to trim their own notes.
 */
export function preparePracticeQuizSource(
  sourceText: string,
): PreparedPracticeQuizSource {
  const text = normalizeExtractedText(sourceText);

  if (!text) {
    return {
      chunks: [],
      originalCharacterCount: 0,
      analyzedCharacterCount: 0,
      usesConceptPass: false,
    };
  }

  if (text.length <= DIRECT_QUIZ_SOURCE_CHARS) {
    return {
      chunks: [{ label: "Complete source", text }],
      originalCharacterCount: text.length,
      analyzedCharacterCount: text.length,
      usesConceptPass: false,
    };
  }

  const completeChunkCount = Math.ceil(text.length / QUIZ_ANALYSIS_CHUNK_CHARS);
  const chunks =
    completeChunkCount <= MAX_QUIZ_ANALYSIS_CHUNKS
      ? splitCompleteSource(text, completeChunkCount)
      : sampleAcrossSource(text, MAX_QUIZ_ANALYSIS_CHUNKS);

  return {
    chunks: chunks.map((chunk, index) => ({
      label: `Section ${index + 1} of ${chunks.length}`,
      text: chunk,
    })),
    originalCharacterCount: text.length,
    analyzedCharacterCount:
      completeChunkCount <= MAX_QUIZ_ANALYSIS_CHUNKS
        ? text.length
        : chunks.reduce(
            (characterCount, chunk) => characterCount + chunk.length,
            0,
          ),
    usesConceptPass: true,
  };
}

function splitCompleteSource(text: string, chunkCount: number) {
  const chunks: string[] = [];
  let start = 0;

  for (let index = 0; index < chunkCount; index += 1) {
    if (index === chunkCount - 1) {
      chunks.push(text.slice(start).trim());
      break;
    }

    const remainingChunks = chunkCount - index;
    const idealEnd = start + Math.ceil((text.length - start) / remainingChunks);
    const end = findNearbyBoundary(text, idealEnd, start + 1);
    chunks.push(text.slice(start, end).trim());
    start = skipWhitespace(text, end);
  }

  return chunks.filter(Boolean);
}

function sampleAcrossSource(text: string, chunkCount: number) {
  const windowLength = QUIZ_ANALYSIS_CHUNK_CHARS;
  const finalStart = Math.max(0, text.length - windowLength);

  return Array.from({ length: chunkCount }, (_, index) => {
    const idealStart =
      chunkCount === 1 ? 0 : Math.round((index * finalStart) / (chunkCount - 1));
    const start = index === 0 ? 0 : findStartBoundary(text, idealStart);
    const idealEnd = Math.min(text.length, start + windowLength);
    const end =
      index === chunkCount - 1
        ? text.length
        : findNearbyBoundary(text, idealEnd, start + 1);

    const body = text.slice(start, end).trim();
    const headingContext = start > 0 ? getHeadingContext(text, start) : "";
    return headingContext && !body.startsWith(headingContext)
      ? `${headingContext}\n\n${body}`
      : body;
  }).filter(Boolean);
}

function getHeadingContext(text: string, beforeIndex: number) {
  const precedingText = text.slice(0, beforeIndex);
  const markdownHeadings = [...precedingText.matchAll(/^#{1,4}\s+.+$/gm)];
  return markdownHeadings.at(-1)?.[0]?.trim() ?? "";
}

function findStartBoundary(text: string, idealStart: number) {
  const searchStart = Math.max(0, idealStart - 600);
  const searchEnd = Math.min(text.length, idealStart + 600);
  const area = text.slice(searchStart, searchEnd);
  const paragraphBreaks = [...area.matchAll(/\n\n+/g)];

  if (paragraphBreaks.length === 0) return idealStart;

  const nearestBreak = paragraphBreaks.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(searchStart + (nearest.index ?? 0) - idealStart);
    const candidateDistance = Math.abs(searchStart + (candidate.index ?? 0) - idealStart);
    return candidateDistance < nearestDistance ? candidate : nearest;
  });

  return skipWhitespace(text, searchStart + (nearestBreak.index ?? 0));
}

function findNearbyBoundary(text: string, idealEnd: number, minimumEnd: number) {
  const searchStart = Math.max(minimumEnd, idealEnd - 700);
  const searchEnd = Math.min(text.length, idealEnd + 700);
  const area = text.slice(searchStart, searchEnd);
  const paragraphBreaks = [...area.matchAll(/\n\n+/g)];

  if (paragraphBreaks.length > 0) {
    const nearestBreak = paragraphBreaks.reduce((nearest, candidate) => {
      const nearestDistance = Math.abs(searchStart + (nearest.index ?? 0) - idealEnd);
      const candidateDistance = Math.abs(searchStart + (candidate.index ?? 0) - idealEnd);
      return candidateDistance < nearestDistance ? candidate : nearest;
    });

    return searchStart + (nearestBreak.index ?? 0);
  }

  const sentenceArea = text.slice(idealEnd, searchEnd);
  const sentenceBreak = sentenceArea.search(/[.!?]\s/);
  return sentenceBreak >= 0 ? idealEnd + sentenceBreak + 1 : idealEnd;
}

function skipWhitespace(text: string, index: number) {
  let nextIndex = index;
  while (nextIndex < text.length && /\s/.test(text[nextIndex] ?? "")) {
    nextIndex += 1;
  }
  return nextIndex;
}
