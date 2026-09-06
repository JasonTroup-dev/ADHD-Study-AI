import { expect, test } from "@playwright/test";

test("quotes a selected tutor passage only on the next question", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  await page.route("**/api/chat", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ contentType: "text/plain", body: "Cells use **selective transport** to maintain balance.\n\nWater moves by osmosis." });
  });
  await page.goto("/demo/study/ai-tutor");
  const composer = page.getByLabel("Message the AI Tutor");
  // Wait for hydration before changing the server-rendered demo wrapper.
  await expect.poll(() => composer.evaluate((element) =>
    Object.keys(element).some((key) => key.startsWith("__reactProps")),
  )).toBe(true);
  // The demo mounts the real tutor inside a read-only wrapper; network calls are mocked.
  await page.locator("[inert]").evaluateAll((elements) => elements.forEach((element) => {
    element.removeAttribute("inert");
    element.removeAttribute("aria-disabled");
  }));
  await expect(async () => {
    await page.getByRole("button", { name: "Summarize Notes" }).click();
    await expect(composer).toHaveValue(/Summarize the notes/);
  }).toPass();
  await composer.fill("Explain cells");
  await composer.press("Enter");
  const response = page.locator("[data-tutor-response]").first();
  await expect(response).toContainText("selective transport");
  async function selectPassage() {
    await response.locator("strong").evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    });
    await page.getByRole("button", { name: "Ask tutor", exact: true }).click();
  }
  await composer.fill("What does that mean?");
  await selectPassage();
  await expect(composer).toBeFocused();
  await expect(composer).toHaveValue("What does that mean?");
  await expect(page.locator("blockquote")).toHaveText("selective transport");
  await page.getByRole("button", { name: "Remove quoted passage" }).click();
  await expect(page.locator("blockquote")).toHaveCount(0);
  await selectPassage();
  await page.screenshot({ path: "test-results/tutor-quote-preview.png" });
  await composer.press("Enter");
  await expect(page.locator("[data-tutor-response]")).toHaveCount(2);
  expect(requests[1].messages.at(-1)?.content).toBe("Regarding this passage from your response:\n> selective transport\n\nWhat does that mean?");
  await expect(page.getByRole("button", { name: "Remove quoted passage" })).toHaveCount(0);
  await composer.fill("Next question");
  await composer.press("Enter");
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2].messages.at(-1)?.content).toBe("Next question");
  expect(pageErrors).toEqual([]);
});

test("quotes a rendered equation without KaTeX accessibility-tree artifacts", async ({ page }) => {
  const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  await page.route("**/api/chat", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "text/plain",
      body: "Now evaluate: $x(1)=x_0+\\int_0^1 2t^2\\,dt$",
    });
  });
  await page.goto("/demo/study/ai-tutor");
  const composer = page.getByLabel("Message the AI Tutor");
  await expect.poll(() => composer.evaluate((element) =>
    Object.keys(element).some((key) => key.startsWith("__reactProps")),
  )).toBe(true);
  await page.locator("[inert]").evaluateAll((elements) => elements.forEach((element) => {
    element.removeAttribute("inert");
    element.removeAttribute("aria-disabled");
  }));
  await composer.fill("Show the calculation");
  await composer.press("Enter");

  const visualMath = page.locator("[data-tutor-response] .katex-html").first();
  await expect(visualMath).toBeVisible();
  await visualMath.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      if (node.textContent) textNodes.push(node as Text);
      node = walker.nextNode();
    }
    const first = textNodes.at(0);
    const last = textNodes.at(-1);
    if (!first || !last) throw new Error("The rendered equation has no selectable text.");

    const range = document.createRange();
    range.setStart(first, 0);
    range.setEnd(last, last.length);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  });
  await page.getByRole("button", { name: "Ask tutor", exact: true }).click();

  const quote = page.locator("blockquote");
  await expect(quote.locator(".katex")).toHaveCount(1);
  await expect(quote.locator("annotation[encoding='application/x-tex']"))
    .toHaveText("x(1)=x_0+\\int_0^1 2t^2\\,dt");

  await composer.fill("How do I calculate that?");
  await composer.press("Enter");
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].messages.at(-1)?.content).toBe(
    "Regarding this passage from your response:\n"
    + "> $x(1)=x_0+\\int_0^1 2t^2\\,dt$\n\n"
    + "How do I calculate that?",
  );
});
