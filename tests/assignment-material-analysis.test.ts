import { beforeEach, describe, expect, it, vi } from "vitest";

const { extractAssignmentMaterialImageText } = vi.hoisted(() => ({
  extractAssignmentMaterialImageText: vi.fn(),
}));

vi.mock("@/lib/ai/assignmentMaterialImage", () => ({
  extractAssignmentMaterialImageText,
}));

import {
  getStudyFileDetails,
  prepareAssignmentMaterials,
} from "@/lib/assignments/materials";

describe("assignment material image analysis", () => {
  beforeEach(() => {
    extractAssignmentMaterialImageText.mockReset();
  });

  it("retries images individually when a grouped analysis fails", async () => {
    extractAssignmentMaterialImageText.mockImplementation(
      async ({ images }: { images: Array<{ index: number; name: string }> }) => {
        if (images.length > 1) throw new Error("group request failed");
        return new Map([[0, `Assignment position: ${images[0].name === "first.png" ? "1" : "2"} of 2`]]);
      },
    );
    const files = ["first.png", "second.png"].map((name) => {
      const file = new File([new Uint8Array([1])], name, { type: "image/png" });
      const details = getStudyFileDetails(file);
      if (!details) throw new Error("Expected a valid test image.");
      return { file, details };
    });

    const prepared = await prepareAssignmentMaterials(files, {
      safetyIdentifier: "test-user",
    });

    expect(extractAssignmentMaterialImageText).toHaveBeenCalledTimes(3);
    expect(prepared.map((material) => material.extractedText)).toEqual([
      "Assignment position: 1 of 2",
      "Assignment position: 2 of 2",
    ]);
    expect(prepared.every((material) => material.warning === null)).toBe(true);
  });
});
