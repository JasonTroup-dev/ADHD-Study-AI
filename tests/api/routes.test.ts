import { beforeEach, describe, expect, it, vi } from "vitest";

const { analyzeSyllabusText, createClient, extractTextFromFile } = vi.hoisted(
  () => ({
    analyzeSyllabusText: vi.fn(),
    createClient: vi.fn(),
    extractTextFromFile: vi.fn(),
  }),
);

vi.mock("@/lib/ai/syllabus", () => ({ analyzeSyllabusText }));
vi.mock("@/lib/files/extractTextFromFile", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/files/extractTextFromFile")
  >();

  return {
    ...original,
    extractTextFromFile,
  };
});
vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { POST as analyzeSyllabus } from "@/app/api/syllabus/analyze/route";
import { POST as uploadAssignmentFile } from "@/app/api/assignments/[id]/file/route";

const user = { id: "00000000-0000-4000-8000-000000000001" };

describe("API route security and failure handling", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("rejects unauthenticated syllabus analysis", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });

    const response = await analyzeSyllabus(
      multipartRequest("syllabus.pdf", "application/pdf"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "You must be logged in to analyze a syllabus.",
    });
    expect(analyzeSyllabusText).not.toHaveBeenCalled();
  });

  it("does not reveal another user's assignment during an upload", async () => {
    const query = assignmentLookup(null);
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn().mockReturnValue(query),
    });

    const response = await uploadAssignmentFile(
      multipartRequest("instructions.txt", "text/plain"),
      { params: Promise.resolve({ id: "someone-elses-assignment" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Assignment not found.",
    });
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", "someone-elses-assignment");
    expect(query.eq).toHaveBeenNthCalledWith(2, "user_id", user.id);
    expect(extractTextFromFile).not.toHaveBeenCalled();
  });

  it("rejects unsupported assignment uploads before storage is called", async () => {
    const query = assignmentLookup({
      id: "assignment-1",
      storage_path: null,
      context_version: 0,
    });
    const upload = vi.fn();
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn().mockReturnValue(query),
      storage: {
        from: vi.fn().mockReturnValue({ upload }),
      },
    });

    const response = await uploadAssignmentFile(
      multipartRequest("malware.exe", "application/octet-stream"),
      { params: Promise.resolve({ id: "assignment-1" }) },
    );

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Unsupported file type"),
    });
    expect(upload).not.toHaveBeenCalled();
    expect(extractTextFromFile).not.toHaveBeenCalled();
  });

  it("returns a safe response when syllabus AI fails", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn().mockReturnValue(classesLookup([])),
    });
    extractTextFromFile.mockResolvedValue({
      text: "Course schedule with enough readable syllabus text.",
      originalName: "syllabus.pdf",
    });
    analyzeSyllabusText.mockRejectedValue(new Error("upstream unavailable"));

    const response = await analyzeSyllabus(
      multipartRequest("syllabus.pdf", "application/pdf"),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error:
        "Could not analyze this syllabus. Nothing was saved. Try again or add assignments manually.",
    });
  });
});

function multipartRequest(fileName: string, contentType: string) {
  const formData = new FormData();
  formData.set("file", new File(["test file"], fileName, { type: contentType }));

  return new Request("http://localhost/api/test", {
    method: "POST",
    body: formData,
  });
}

function assignmentLookup(data: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function classesLookup(data: unknown[]) {
  const query = {
    select: vi.fn(),
    eq: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  return query;
}
