import { beforeEach, describe, expect, it, vi } from "vitest";

const { createStream, runAIRequest } = vi.hoisted(() => ({
  createStream: vi.fn(), runAIRequest: vi.fn(),
}));
vi.mock("@/lib/ai/runtime", () => ({ runAIRequest }));

import { getStudyTutorResponse, type StudyTutorContext } from "@/lib/ai/studySessionTutor";
import { buildAssignmentProblemIndex } from "@/lib/ai/studyTutorContext";

const context: StudyTutorContext = {
  sessionTitle: "Problems 2-4", sessionType: "assignment",
  assignment: {
    title: "Physics", description: null, className: null, dueDate: null,
    instructions: null, materials: [],
    studySessionGoal: { sessionNumber: 2, totalSessions: 3, percentage: 33 },
  },
};

function mockResponse(message = "Let's check the remaining work.", status = "completed") {
  const result = {
    status,
    output_parsed: { message, completionStatus: "in_progress", completionReason: "" },
  };
  createStream.mockReturnValue({
    on: (_event: string, receive: (event: { snapshot: string }) => void) => {
      receive({ snapshot: JSON.stringify(result.output_parsed) });
    },
    finalResponse: async () => result,
  });
}

beforeEach(() => {
  mockResponse();
  runAIRequest.mockImplementation(async (_workflow, execute) => execute({
    client: { responses: { stream: createStream } }, model: "test-model", requestOptions: {},
  }));
});

describe("tutor response completion and delivery", () => {
  it.each([
    "I finished part A.",
    "I finished 10%.",
    "I finished this session's first problem.",
    "I finished this session, but let's continue with problem 5.",
    "I don't think I finished this session.",
    "If I finished this session, what would be next?",
  ])("does not force completion for a partial or qualified statement: %s", async (content) => {
    const result = await getStudyTutorResponse(context, [{ role: "user", content }]);
    expect(result.completionStatus).toBe("in_progress");
    expect(result.completionReason).toBe("");
  });

  it("recognizes a standalone report of finishing the planned chunk", async () => {
    const result = await getStudyTutorResponse(context, [{ role: "user", content: "I've finished the planned chunk." }]);
    expect(result.completionStatus).toBe("ready");
    expect(result.completionReason).toBe("You reported finishing the planned work for this session.");
  });

  it("does not force completion of an assignment when only part of its final question is done", async () => {
    const result = await getStudyTutorResponse({ ...context, assignment: null }, [{
      role: "user", content: "I finished the final question's part A, but I still need part B.",
    }]);
    expect(result.completionStatus).toBe("in_progress");
  });

  it("recognizes an unqualified report of finishing the final question", async () => {
    const result = await getStudyTutorResponse({ ...context, assignment: null }, [{
      role: "user", content: "I finished the final question.",
    }]);
    expect(result.completionStatus).toBe("ready");
    expect(result.completionReason).toBe("You reported finishing the final question.");
  });

  it("keeps streamed and final labels identical with overlapping problem numbers", async () => {
    const materials = [
      { name: "five", content: "Assignment position: 5 of 13\nDisplayed problem identifier: Problem 3.3" },
      { name: "six", content: "Assignment position: 6 of 13\nDisplayed problem identifier: Problem 3.34" },
    ];
    mockResponse("Problem 6 (textbook Problem 3.34). Review Problem 3.3.");
    const onMessage = vi.fn();
    const result = await getStudyTutorResponse({
      ...context,
      assignment: { ...context.assignment!, materials, problemIndex: buildAssignmentProblemIndex(materials) },
    }, [{ role: "user", content: "Let's start problem 6." }], undefined, onMessage);
    expect(result.message).toBe("Problem 6 (textbook Problem 3.34). Review Problem 5 (textbook Problem 3.3).");
    expect(onMessage).toHaveBeenLastCalledWith(result.message);
  });

  it("rejects an incomplete model response instead of treating the partial reply as complete", async () => {
    mockResponse("You are looking at **Problem 7", "incomplete");
    await expect(getStudyTutorResponse(context, [{ role: "user", content: "Explain this problem." }]))
      .rejects.toThrow("unreadable response");
  });
});
