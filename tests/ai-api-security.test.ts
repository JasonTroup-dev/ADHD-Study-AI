import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClient,
  extractTextFromFile,
  generateFlashcardsFromText,
  generateStudyGuideFromText,
  getTutorResponseStream,
} = vi.hoisted(() => ({
  createClient: vi.fn(),
  extractTextFromFile: vi.fn(),
  generateFlashcardsFromText: vi.fn(),
  generateStudyGuideFromText: vi.fn(),
  getTutorResponseStream: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/files/extractTextFromFile", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/files/extractTextFromFile")
  >();

  return { ...original, extractTextFromFile };
});
vi.mock("@/lib/ai/flashcards", () => ({ generateFlashcardsFromText }));
vi.mock("@/lib/ai/studyGuides", () => ({ generateStudyGuideFromText }));
vi.mock("@/lib/ai/tutor", () => ({ getTutorResponseStream }));

import { POST as chat } from "@/app/api/chat/route";
import { POST as chatFiles } from "@/app/api/chat/files/route";
import { POST as generateFlashcards } from "@/app/api/flashcards/generate/route";
import { POST as generateStudyGuide } from "@/app/api/study-guides/generate/route";

const user = { id: "00000000-0000-4000-8000-000000000001" };

describe("AI API protection", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it.each([
    ["chat", chat, jsonChatRequest()],
    ["chat files", chatFiles, multipartRequest()],
    ["flashcards", generateFlashcards, multipartRequest()],
    ["study guides", generateStudyGuide, multipartRequest()],
  ])("rejects unauthenticated %s requests", async (_name, handler, request) => {
    createClient.mockResolvedValue(authClient(null));

    const response = await handler(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "You must be signed in to use AI features.",
    });
  });

  it.each([
    ["chat", "chat", chat, jsonChatRequest()],
    ["chat files", "chat_files", chatFiles, multipartRequest()],
    ["flashcards", "flashcards", generateFlashcards, multipartRequest()],
    ["study guides", "study_guides", generateStudyGuide, multipartRequest()],
  ])(
    "returns 429 before expensive %s work when its quota is exhausted",
    async (_name, quotaKey, handler, request) => {
      const client = authClient(user, {
        allowed: false,
        limit: 5,
        remaining: 0,
        reset_at: new Date(Date.now() + 60_000).toISOString(),
      });
      createClient.mockResolvedValue(client);

      const response = await handler(request);

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toMatch(/^\d+$/);
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(client.rpc).toHaveBeenCalledWith("consume_ai_quota", {
        requested_quota: quotaKey,
      });
      expect(extractTextFromFile).not.toHaveBeenCalled();
      expect(getTutorResponseStream).not.toHaveBeenCalled();
      expect(generateFlashcardsFromText).not.toHaveBeenCalled();
      expect(generateStudyGuideFromText).not.toHaveBeenCalled();
    },
  );

  it("rejects an oversized total chat conversation before consuming quota", async () => {
    const client = authClient(user, allowedQuota());
    createClient.mockResolvedValue(client);
    const messages = Array.from({ length: 9 }, (_, index) => ({
      id: `message-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      content: "x".repeat(20_000),
    }));

    const response = await chat(jsonChatRequest(messages));

    expect(response.status).toBe(413);
    expect(client.rpc).not.toHaveBeenCalled();
    expect(getTutorResponseStream).not.toHaveBeenCalled();
  });

  it("fails closed when quota storage is unavailable", async () => {
    const client = authClient(user, allowedQuota());
    client.rpc.mockRejectedValue(new Error("database unavailable"));
    createClient.mockResolvedValue(client);

    const response = await chat(jsonChatRequest());

    expect(response.status).toBe(503);
    expect(getTutorResponseStream).not.toHaveBeenCalled();
  });

  it("passes a stable, privacy-preserving user identifier to model requests", async () => {
    createClient.mockResolvedValue(authClient(user, allowedQuota()));
    extractTextFromFile.mockResolvedValue({
      text: "Readable course material for a model request.",
      originalName: "notes.txt",
    });
    getTutorResponseStream.mockResolvedValue(emptyTutorStream());
    generateFlashcardsFromText.mockResolvedValue({
      title: "Notes",
      description: "Key ideas from the uploaded notes.",
      cards: [],
    });
    generateStudyGuideFromText.mockResolvedValue("# Notes\n\nA study guide.");

    const chatResponse = await chat(jsonChatRequest());
    const flashcardResponse = await generateFlashcards(multipartRequest());
    const guideResponse = await generateStudyGuide(multipartRequest());
    await chatResponse.text();

    expect(chatResponse.status).toBe(200);
    expect(flashcardResponse.status).toBe(200);
    expect(guideResponse.status).toBe(200);

    const chatIdentifier = getTutorResponseStream.mock.calls[0]?.[2];
    const flashcardIdentifier = generateFlashcardsFromText.mock.calls[0]?.[2];
    const guideIdentifier = generateStudyGuideFromText.mock.calls[0]?.[1];

    expect(chatIdentifier).toMatch(/^[a-f0-9]{64}$/);
    expect(flashcardIdentifier).toBe(chatIdentifier);
    expect(guideIdentifier).toBe(chatIdentifier);
    expect(chatIdentifier).not.toContain(user.id);
  });
});

function authClient(
  authenticatedUser: typeof user | null,
  quotaData: ReturnType<typeof allowedQuota> | null = null,
) {
  const studyGuideSaveQuery = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: "00000000-0000-4000-8000-000000000010",
        created_at: "2026-08-07T20:00:00.000Z",
      },
      error: null,
    }),
  };
  studyGuideSaveQuery.insert.mockReturnValue(studyGuideSaveQuery);
  studyGuideSaveQuery.select.mockReturnValue(studyGuideSaveQuery);

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticatedUser },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: quotaData, error: null }),
    from: vi.fn().mockReturnValue(studyGuideSaveQuery),
  };
}

function allowedQuota() {
  return {
    allowed: true,
    limit: 30,
    remaining: 29,
    reset_at: new Date(Date.now() + 60_000).toISOString(),
  };
}

function jsonChatRequest(
  messages: Array<{ id: string; role: string; content: string }> = [
    { id: "message-1", role: "user", content: "Help me study." },
  ],
) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
}

function multipartRequest() {
  const formData = new FormData();
  formData.set("file", new File(["study notes"], "notes.txt", {
    type: "text/plain",
  }));

  return new Request("http://localhost/api/test", {
    method: "POST",
    body: formData,
  });
}

function emptyTutorStream() {
  return {
    controller: { abort: vi.fn() },
    async *[Symbol.asyncIterator]() {
      return;
    },
  };
}
