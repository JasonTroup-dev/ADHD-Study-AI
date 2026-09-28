import { expect, test } from "@playwright/test";

import { signUpAndOpen } from "./helpers/auth";

test("does not expose or delete another user's class through application APIs", async ({
  browser,
}) => {
  const ownerContext = await browser.newContext();
  const otherContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const otherPage = await otherContext.newPage();

  try {
    await signUpAndOpen(ownerPage, "/classes", "resource-owner");
    const ownedClass = await ownerPage.evaluate(async () => {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Private Biology",
          classCode: "BIO-PRIVATE",
          professorName: "Dr. Owner",
          color: "green",
        }),
      });

      return { status: response.status, body: await response.json() };
    });

    expect(ownedClass.status).toBe(201);
    const classId = ownedClass.body.class.id as string;

    await signUpAndOpen(otherPage, "/classes", "resource-other");
    const otherUserResult = await otherPage.evaluate(async (ownedId) => {
      const [listResponse, deleteResponse] = await Promise.all([
        fetch("/api/classes"),
        fetch(`/api/classes/${ownedId}`, { method: "DELETE" }),
      ]);

      return {
        classes: await listResponse.json(),
        deleteStatus: deleteResponse.status,
        deleteBody: await deleteResponse.json(),
      };
    }, classId);

    expect(otherUserResult.classes.classes).toEqual([]);
    expect(otherUserResult.deleteStatus).toBe(404);
    expect(otherUserResult.deleteBody).toEqual({ error: "Class not found." });

    const ownerClasses = await ownerPage.evaluate(async () => {
      const response = await fetch("/api/classes");
      return response.json();
    });
    expect(ownerClasses.classes).toEqual([
      expect.objectContaining({ id: classId, name: "Private Biology" }),
    ]);
  } finally {
    await Promise.all([ownerContext.close(), otherContext.close()]);
  }
});
