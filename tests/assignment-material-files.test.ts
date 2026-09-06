import { describe, expect, it } from "vitest";

import { getStudyFileDetails } from "@/lib/assignments/materials";
import { ASSIGNMENT_MATERIAL_FILE_ACCEPT } from "@/lib/files/uploadConstraints";

describe("assignment material file validation", () => {
  it("includes image MIME types in the native file chooser filter", () => {
    expect(ASSIGNMENT_MATERIAL_FILE_ACCEPT).toContain("image/png");
    expect(ASSIGNMENT_MATERIAL_FILE_ACCEPT).toContain("image/jpeg");
    expect(ASSIGNMENT_MATERIAL_FILE_ACCEPT).toContain("image/webp");
    expect(ASSIGNMENT_MATERIAL_FILE_ACCEPT).toContain("image/gif");
  });

  it("accepts supported clipboard image formats", () => {
    expect(getStudyFileDetails(
      new File([new Uint8Array([1])], "clipboard-image.png", {
        type: "image/png",
      }),
    )).toEqual({ extension: ".png", contentType: "image/png" });

    expect(getStudyFileDetails(
      new File([new Uint8Array([1])], "photo.jpg", {
        type: "image/jpeg",
      }),
    )).toEqual({ extension: ".jpg", contentType: "image/jpeg" });
  });

  it("rejects an image extension with a mismatched MIME type", () => {
    expect(getStudyFileDetails(
      new File(["not an image"], "fake.png", { type: "text/plain" }),
    )).toBeNull();
  });
});
