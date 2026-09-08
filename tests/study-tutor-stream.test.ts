import { describe, expect, it, vi } from "vitest";
import { readPartialTutorMessage } from "@/lib/ai/studyTutorStream";
import { readTutorStream } from "@/components/study-sessions/guided-session/api";

describe("study tutor streaming", () => {
  it("decodes message prefixes without exposing JSON or split escapes", () => {
    const message = 'Try "this"\n\\frac{1}{2} — 🧠';
    const json = JSON.stringify({ message, completionStatus: "ready", completionReason: "Done" });
    for (let end = 0; end <= json.length; end++) {
      expect(message.startsWith(readPartialTutorMessage(json.slice(0, end)))).toBe(true);
    }
    expect(readPartialTutorMessage(json)).toBe(message);
  });

  it("delivers text before completion and handles fragmented UTF-8 frames", async () => {
    const encoder = new TextEncoder();
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const response = new Response(new ReadableStream<Uint8Array>({ start(value) { controller = value; } }));
    const onMessage = vi.fn();
    const result = readTutorStream(response, onMessage);
    let completed = false;
    void result.then(() => { completed = true; });
    const first = encoder.encode(JSON.stringify({ type: "message", message: "Hello 🧠" }) + "\n");
    for (const byte of first) controller.enqueue(new Uint8Array([byte]));
    await vi.waitFor(() => expect(onMessage).toHaveBeenCalledWith("Hello 🧠"));
    expect(completed).toBe(false);
    const final = {
      message: "Hello 🧠!",
      completionStatus: "ready",
      completionReason: "Finished",
      flashcardAction: "none",
    };
    controller.enqueue(encoder.encode(JSON.stringify({ type: "complete", ...final }) + "\n"));
    controller.close();
    await expect(result).resolves.toEqual(final);
  });

  it("rejects truncated streams instead of accepting partial completion", async () => {
    const response = new Response('{"type":"message","message":"Partial"}\n');
    await expect(readTutorStream(response)).rejects.toThrow("interrupted");
  });

  it("surfaces server errors after text has started", async () => {
    const response = new Response('{"type":"message","message":"Partial"}\n{"type":"error","error":"Try again"}\n');
    await expect(readTutorStream(response)).rejects.toThrow("Try again");
  });
});
