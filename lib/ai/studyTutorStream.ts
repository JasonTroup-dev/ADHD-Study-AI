// Structured output emits `message` first. Decode only complete JSON string
// tokens so split escapes never appear in the student's markdown.
export function readPartialTutorMessage(snapshot: string): string {
  const match = /^\s*\{\s*"message"\s*:\s*"((?:[^"\\]|\\["\\/bfnrt]|\\u[\da-fA-F]{4})*)/.exec(snapshot);
  if (!match) return "";
  return (JSON.parse(`"${match[1]}"`) as string).replace(/[\uD800-\uDBFF]$/, "");
}
