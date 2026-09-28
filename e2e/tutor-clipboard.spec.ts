import { expect, test } from "@playwright/test";

test("pastes clipboard images into the AI Tutor composer", async ({ page }) => {
  let uploadedClipboardImage = false;
  let chatRequest: Record<string, unknown> | null = null;
  const pageErrors: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.route("**/api/chat/files", async (route) => {
    const body = route.request().postDataBuffer()?.toString("utf8") ?? "";
    uploadedClipboardImage = body.includes("clipboard-image-")
      && body.includes("image/png");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        attachments: [{
          name: "clipboard-image.png",
          kind: "image",
          mediaType: "image/png",
          content: "data:image/png;base64,AQID",
        }],
      }),
    });
  });

  await page.route("**/api/chat", async (route) => {
    chatRequest = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: "I can help explain the pasted image.",
    });
  });

  await page.goto("/demo/study/ai-tutor");
  await page.locator("[inert]").evaluateAll((elements) => {
    elements.forEach((element) => {
      element.removeAttribute("inert");
      element.removeAttribute("aria-disabled");
    });
  });
  const composer = page.getByLabel("Message the AI Tutor");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.evaluate(async () => {
    const pngBytes = Uint8Array.from(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="),
      (character) => character.charCodeAt(0),
    );
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": new Blob([pngBytes], {
          type: "image/png",
        }),
      }),
    ]);
  });
  await composer.focus();
  await expect(composer).toBeFocused();
  await composer.press("Control+V");

  expect(pageErrors).toEqual([]);
  await expect(page.getByText(/clipboard-image-\d+-1\.png/)).toBeVisible();

  await composer.fill("Explain this diagram.");
  await composer.press("Enter");

  await expect(page.getByText("I can help explain the pasted image.")).toBeVisible();
  expect(uploadedClipboardImage).toBe(true);
  expect(chatRequest).toMatchObject({
    messages: expect.arrayContaining([
      expect.objectContaining({
        role: "user",
        content: "Explain this diagram.",
        attachments: [expect.objectContaining({
          kind: "image",
          mediaType: "image/png",
        })],
      }),
    ]),
  });
});
