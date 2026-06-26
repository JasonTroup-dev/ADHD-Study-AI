import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import {
  MAX_TUTOR_ATTACHMENT_CHARS,
  SUPPORTED_STUDY_FILE_EXTENSIONS,
  SUPPORTED_STUDY_FILE_LABEL,
  type SupportedStudyFileExtension,
} from "@/lib/files/uploadConstraints";

export const MAX_FLASHCARD_SOURCE_CHARS = 60_000;

export type FileTextExtractionErrorCode =
  | "unsupported_file_type"
  | "unreadable_file"
  | "empty_extracted_text";

export class FileTextExtractionError extends Error {
  constructor(
    public readonly code: FileTextExtractionErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "FileTextExtractionError";
  }
}

export type ExtractTextFromFileResult = {
  text: string;
  extension: SupportedStudyFileExtension;
  originalName: string;
};

const supportedExtensions = new Set<string>(SUPPORTED_STUDY_FILE_EXTENSIONS);

export async function extractTextFromFile(
  file: File,
): Promise<ExtractTextFromFileResult> {
  const extension = getSupportedExtension(file.name);
  const buffer = await file.arrayBuffer();

  try {
    const rawText = await extractTextByExtension(extension, buffer);
    const text = normalizeExtractedText(rawText);

    if (!text) {
      throw new FileTextExtractionError(
        "empty_extracted_text",
        "No readable text was found in the uploaded file.",
      );
    }

    return {
      text,
      extension,
      originalName: file.name,
    };
  } catch (error) {
    if (error instanceof FileTextExtractionError) {
      throw error;
    }

    throw new FileTextExtractionError(
      "unreadable_file",
      "The uploaded file could not be read. Try another study document.",
      { cause: error },
    );
  }
}

export function prepareFlashcardSourceText(text: string) {
  return prepareSourceText(
    text,
    "[Document shortened before flashcard generation. Middle content omitted.]",
  );
}

export function prepareStudyGuideSourceText(text: string) {
  return prepareSourceText(
    text,
    "[Document shortened before study guide generation. Middle content omitted.]",
  );
}

export function prepareTutorSourceText(text: string, maxChars = MAX_TUTOR_ATTACHMENT_CHARS) {
  return prepareSourceText(
    text,
    "[Document shortened before being shared with the AI tutor. Middle content omitted.]",
    maxChars,
  );
}

export function normalizeExtractedText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function prepareSourceText(
  text: string,
  omittedMessage: string,
  maxChars = MAX_FLASHCARD_SOURCE_CHARS,
) {
  const normalizedText = normalizeExtractedText(text);

  if (normalizedText.length <= maxChars) {
    return normalizedText;
  }

  const omittedNotice = `\n\n${omittedMessage}\n\n`;
  const availableChars = maxChars - omittedNotice.length;
  const headLength = Math.floor(availableChars * 0.7);
  const tailLength = availableChars - headLength;

  return [
    trimToWordBoundary(normalizedText.slice(0, headLength), "end"),
    omittedNotice.trim(),
    trimToWordBoundary(normalizedText.slice(-tailLength), "start"),
  ].join("\n\n");
}

async function extractTextByExtension(
  extension: SupportedStudyFileExtension,
  buffer: ArrayBuffer,
): Promise<string> {
  switch (extension) {
    case ".txt":
    case ".md":
      return decodeTextBuffer(buffer);
    case ".csv":
      return parseCsvToText(decodeTextBuffer(buffer));
    case ".json":
      return parseJsonToText(decodeTextBuffer(buffer));
    case ".pdf":
      return extractPdfText(buffer);
    case ".docx":
      return extractDocxText(buffer);
  }

  const exhaustiveExtension: never = extension;
  return exhaustiveExtension;
}

function getSupportedExtension(fileName: string): SupportedStudyFileExtension {
  const extension = getFileExtension(fileName);

  if (supportedExtensions.has(extension)) {
    return extension as SupportedStudyFileExtension;
  }

  throw new FileTextExtractionError(
    "unsupported_file_type",
    `Unsupported file type. Upload a ${SUPPORTED_STUDY_FILE_LABEL} file.`,
  );
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "";
  }

  return fileName.slice(lastDotIndex).toLowerCase();
}

function decodeTextBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }

  return new TextDecoder("utf-8").decode(bytes);
}

async function extractPdfText(buffer: ArrayBuffer) {
  const parser = new PDFParse({
    data: new Uint8Array(buffer),
  });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: ArrayBuffer) {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(buffer),
  });

  return result.value;
}

function parseCsvToText(csv: string) {
  return parseCsvRows(csv)
    .map((row) => row.map((cell) => cell.trim()).filter(Boolean).join(" | "))
    .filter(Boolean)
    .join("\n");
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let isQuoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (isQuoted) {
      if (char === '"' && nextChar === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        isQuoted = false;
      } else {
        cell += char;
      }

      continue;
    }

    if (char === '"') {
      isQuoted = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

function parseJsonToText(json: string) {
  try {
    const values: string[] = [];
    collectJsonText(JSON.parse(json) as unknown, values);

    return values.join("\n");
  } catch (error) {
    throw new FileTextExtractionError(
      "unreadable_file",
      "The uploaded JSON file could not be parsed.",
      { cause: error },
    );
  }
}

function collectJsonText(value: unknown, values: string[], key?: string) {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "string") {
    values.push(key ? `${key}: ${value}` : value);
    return;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    values.push(key ? `${key}: ${value}` : String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonText(item, values, key));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([entryKey, entryValue]) => {
      collectJsonText(entryValue, values, entryKey);
    });
  }
}

function trimToWordBoundary(text: string, side: "start" | "end") {
  const trimmedText = side === "start" ? text.trimStart() : text.trimEnd();
  const boundaryPattern = side === "start" ? /\s/ : /\s(?!.*\s)/;
  const boundaryIndex = trimmedText.search(boundaryPattern);

  if (boundaryIndex <= 0) {
    return trimmedText;
  }

  return side === "start"
    ? trimmedText.slice(boundaryIndex).trimStart()
    : trimmedText.slice(0, boundaryIndex).trimEnd();
}
