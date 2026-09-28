/** Keep the reference in message content so it survives history trimming and resume. */
export function withTutorQuote(question: string, quote?: string | null): string {
  if (!quote?.trim()) return question.trim();
  return `Regarding this passage from your response:\n${quote.trim().split("\n").map((line) => `> ${line}`).join("\n")}\n\n${question.trim()}`;
}
