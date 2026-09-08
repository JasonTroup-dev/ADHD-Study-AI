import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, getUser, update } = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: { from, auth: { getUser } },
}));

import {
  normalizeStudySessionMessages,
  saveStudySessionMessages,
} from "@/lib/studySessions";

beforeEach(() => {
  const builder = {
    update,
    eq: vi.fn(() => builder),
    select: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: { id: "session-1" }, error: null })),
  };

  getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  from.mockReturnValue(builder);
  update.mockReturnValue(builder);
});

describe("study session message persistence", () => {
  it("removes PostgreSQL-incompatible Unicode before saving messages", async () => {
    await saveStudySessionMessages("session-1", [{
      id: "message-\u0000-1",
      role: "assistant",
      content: "before\u0000after\ud800done",
      completionStatus: "ready",
      completionReason: "finished\u0000\udc00",
    }]);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      messages: [{
        id: "message--1",
        role: "assistant",
        content: "beforeafter\uFFFDdone",
        completionStatus: "ready",
        completionReason: "finished\uFFFD",
      }],
    }));
    expect(JSON.stringify(update.mock.calls[0][0].messages)).not.toMatch(
      /\\u(?:0000|d[89ab][0-9a-f]{2}|d[cdef][0-9a-f]{2})/i,
    );
  });

  it("does not split a valid surrogate pair at the storage limit", () => {
    const messages = normalizeStudySessionMessages([{
      id: "message-1",
      role: "assistant",
      content: `${"a".repeat(11_999)}🧠more`,
    }]);

    expect(messages[0].content).toBe("a".repeat(11_999));
    expect(messages[0].content).not.toMatch(/[\ud800-\udfff]$/u);
  });
});
