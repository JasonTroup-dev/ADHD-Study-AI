import {
  formatFileSize,
  MAX_TUTOR_IMAGE_BYTES,
  SUPPORTED_TUTOR_IMAGE_TYPES,
  type SupportedTutorImageType,
} from "@/lib/files/uploadConstraints";

export type UploadedTutorAttachment = {
  name: string;
  content: string;
  kind: "text" | "image";
  mediaType?: SupportedTutorImageType;
};

export class TutorFileUploadError extends Error {}

export async function uploadTutorFiles(
  files: File[],
  signal: AbortSignal,
): Promise<UploadedTutorAttachment[]> {
  const formData = new FormData();
  const preparedFiles = await Promise.all(files.map(prepareTutorFile));

  preparedFiles.forEach((file) => formData.append("files", file));

  const response = await fetch("/api/chat/files", {
    method: "POST",
    body: formData,
    signal,
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new TutorFileUploadError(
      typeof payload.error === "string"
        ? payload.error
        : "Could not read the attached files.",
    );
  }

  if (
    !Array.isArray(payload.attachments)
    || !payload.attachments.every(isUploadedTutorAttachment)
  ) {
    throw new TutorFileUploadError("The file upload response was incomplete.");
  }

  return payload.attachments;
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload = await response.json();
    return typeof payload === "object" && payload !== null
      ? payload as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function isUploadedTutorAttachment(
  value: unknown,
): value is UploadedTutorAttachment {
  return (
    typeof value === "object"
    && value !== null
    && "name" in value
    && typeof value.name === "string"
    && "content" in value
    && typeof value.content === "string"
    && "kind" in value
    && (value.kind === "text" || value.kind === "image")
    && (
      value.kind === "text"
      || (
        "mediaType" in value
        && typeof value.mediaType === "string"
        && SUPPORTED_TUTOR_IMAGE_TYPES.includes(
          value.mediaType as SupportedTutorImageType,
        )
      )
    )
  );
}

async function prepareTutorFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= MAX_TUTOR_IMAGE_BYTES) {
    return file;
  }

  try {
    return await compressTutorImage(file);
  } catch {
    throw new TutorFileUploadError(
      `Images must be ${formatFileSize(MAX_TUTOR_IMAGE_BYTES)} or smaller after compression.`,
    );
  }
}

async function compressTutorImage(file: File): Promise<File> {
  const source = await createImageBitmap(file);

  try {
    let width = source.width;
    let height = source.height;
    const longestSide = Math.max(width, height);

    if (longestSide > 1600) {
      const scale = 1600 / longestSide;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) throw new Error("Canvas rendering is unavailable.");

      context.drawImage(source, 0, 0, width, height);
      const quality = Math.max(0.45, 0.86 - attempt * 0.08);
      const blob = await canvasToBlob(canvas, "image/webp", quality);

      if (blob.size <= MAX_TUTOR_IMAGE_BYTES) {
        return new File(
          [blob],
          replaceFileExtension(file.name, "webp"),
          { type: "image/webp", lastModified: file.lastModified },
        );
      }

      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }
  } finally {
    source.close();
  }

  throw new Error("The image could not be compressed enough.");
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The image could not be encoded."));
    }, type, quality);
  });
}

function replaceFileExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "") || "clipboard-image";
  return `${baseName}.${extension}`;
}
