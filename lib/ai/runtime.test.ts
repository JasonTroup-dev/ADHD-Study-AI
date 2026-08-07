import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  AI_WORKFLOWS,
  estimateAICostUsd,
  getAIModel,
} from "@/lib/ai/runtime";

const originalFlashcardModel = process.env.OPENAI_FLASHCARDS_MODEL;

afterEach(() => {
  if (originalFlashcardModel === undefined) {
    delete process.env.OPENAI_FLASHCARDS_MODEL;
  } else {
    process.env.OPENAI_FLASHCARDS_MODEL = originalFlashcardModel;
  }
});

describe("AI runtime", () => {
  it("uses centralized defaults and environment overrides", () => {
    delete process.env.OPENAI_FLASHCARDS_MODEL;
    assert.equal(
      getAIModel("flashcards"),
      AI_WORKFLOWS.flashcards.defaultModel,
    );

    process.env.OPENAI_FLASHCARDS_MODEL = "custom-eval-model";
    assert.equal(getAIModel("flashcards"), "custom-eval-model");
  });

  it("estimates standard and cached token cost", () => {
    assert.equal(
      estimateAICostUsd("gpt-5.4-mini", {
        input_tokens: 1_000_000,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 1_000_000,
      }),
      5.25,
    );
    assert.equal(
      estimateAICostUsd("gpt-5-mini-2025-08-07", {
        input_tokens: 500_000,
        input_tokens_details: { cached_tokens: 200_000 },
        output_tokens: 100_000,
      }),
      0.28,
    );
  });

  it("does not invent a cost for an unknown model override", () => {
    assert.equal(
      estimateAICostUsd("custom-model", {
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 50,
      }),
      null,
    );
  });
});
