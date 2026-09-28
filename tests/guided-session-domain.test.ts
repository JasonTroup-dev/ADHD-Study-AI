import { describe, expect, it } from "vitest";

import {
  removePendingTutorMessage,
  shouldDisableTutorComposer,
} from "@/components/study-sessions/guided-session/domain";

describe("guided study session controls", () => {
  it("keeps the composer enabled when completion is available", () => {
    const controllerState = {
      completionUnlocked: true,
      isCompleting: false,
      isTutorLoading: false,
      isUploading: false,
    };

    expect(shouldDisableTutorComposer(controllerState)).toBe(false);
  });

  it("only removes the empty pending assistant response when stopped", () => {
    expect(removePendingTutorMessage([
      { id: "assistant-1", role: "assistant", content: "A prior answer." },
      { id: "user-1", role: "user", content: "My latest question." },
      { id: "assistant-2", role: "assistant", content: "" },
    ])).toEqual([
      { id: "assistant-1", role: "assistant", content: "A prior answer." },
      { id: "user-1", role: "user", content: "My latest question." },
    ]);
  });
});
