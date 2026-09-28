import { Buffer } from "node:buffer";

import { expect, test } from "@playwright/test";

import { signUpAndOpen } from "./helpers/auth";

test("rejects unsupported and oversized syllabi before analysis", async ({
  page,
}) => {
  await signUpAndOpen(page, "/planner", "upload-boundaries");
  await page.getByRole("button", { name: "Generate Study Plan" }).click();

  const fileInput = page.locator("#study-plan-source-file");

  await fileInput.setInputFiles({
    name: "course-syllabus.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("not a syllabus"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Unsupported file type. Upload a PDF or DOCX syllabus.",
  );
  await expect(page.getByRole("button", { name: "Analyze syllabus" })).toBeDisabled();

  await fileInput.setInputFiles({
    name: "oversized-syllabus.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Upload a file 25MB or smaller.",
  );
  await expect(page.getByRole("button", { name: "Analyze syllabus" })).toBeDisabled();
});
