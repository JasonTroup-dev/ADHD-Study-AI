type ClipboardFileData = Pick<DataTransfer, "files" | "items">;

/**
 * Returns files carried by a paste event. Clipboard items are preferred because
 * some browsers do not also expose pasted blobs through DataTransfer.files.
 */
export function getClipboardFiles(clipboardData: ClipboardFileData) {
  const itemFiles = Array.from(clipboardData.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
  const files = itemFiles.length > 0
    ? itemFiles
    : Array.from(clipboardData.files);
  const timestamp = Date.now();

  return files.map((file, index) =>
    file.type.startsWith("image/")
      ? nameClipboardImage(file, index, timestamp)
      : file,
  );
}

function nameClipboardImage(
  image: Blob,
  index: number,
  timestamp: number,
) {
  const extension = image.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  return new File(
    [image],
    `clipboard-image-${timestamp}-${index + 1}.${extension}`,
    { type: image.type, lastModified: timestamp },
  );
}
