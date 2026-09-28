import { beforeEach, describe, expect, it, vi } from "vitest";

const { createStream, runAIRequest } = vi.hoisted(() => ({
  createStream: vi.fn(),
  runAIRequest: vi.fn(),
}));

vi.mock("@/lib/ai/runtime", () => ({ runAIRequest }));

import { getStudyTutorResponse } from "@/lib/ai/studySessionTutor";

describe("guided study tutor vision input", () => {
  beforeEach(() => {
    createStream.mockReturnValue({
      on: vi.fn(),
      finalResponse: vi.fn().mockResolvedValue({
        status: "completed",
        output_parsed: {
          message: "I can help with that image.",
          completionStatus: "in_progress",
          completionReason: "",
        },
      }),
    });
    runAIRequest.mockImplementation(async (_workflow, execute) => execute({
      client: { responses: { stream: createStream } },
      model: "test-model",
      requestOptions: {},
    }));
  });

  it("sends a pasted image as transient image content", async () => {
    await getStudyTutorResponse(
      {
        sessionTitle: "Study assignment",
        sessionType: "assignment",
        assignment: null,
      },
      [{
        role: "user",
        content: "Explain this diagram.",
        attachments: [{
          id: "image-1",
          name: "clipboard-image.png",
          kind: "image",
          mediaType: "image/png",
          content: "data:image/png;base64,AQID",
        }],
      }],
    );

    const request = createStream.mock.calls[0]?.[0];
    expect(request.input.at(-1)).toEqual({
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Explain this diagram.\n\nAttached images: clipboard-image.png",
        },
        {
          type: "input_image",
          detail: "auto",
          image_url: "data:image/png;base64,AQID",
        },
      ],
    });
  });
});
