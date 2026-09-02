import { beforeEach, describe, expect, it, vi } from "vitest";

const { createResponse, runAIStream } = vi.hoisted(() => ({
  createResponse: vi.fn(),
  runAIStream: vi.fn(),
}));

vi.mock("@/lib/ai/runtime", () => ({ runAIStream }));

import { getTutorResponseStream } from "@/lib/ai/tutor";

describe("AI tutor vision input", () => {
  beforeEach(() => {
    createResponse.mockResolvedValue({});
    runAIStream.mockImplementation(async (_workflow, execute) => execute({
      client: { responses: { create: createResponse } },
      model: "test-model",
      requestOptions: {},
    }));
  });

  it("sends pasted images as image content alongside the user's text", async () => {
    await getTutorResponseStream([{
      id: "message-1",
      role: "user",
      content: "Explain this diagram.",
      attachments: [{
        id: "image-1",
        name: "clipboard-image.png",
        kind: "image",
        mediaType: "image/png",
        content: "data:image/png;base64,AQID",
      }],
    }]);

    const request = createResponse.mock.calls[0]?.[0];
    expect(request.input[1]).toEqual({
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
