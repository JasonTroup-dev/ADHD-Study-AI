import { test } from "vitest";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import AiMarkdown from "./AiMarkdown.tsx";
import { normalizeMathDelimiters } from "../lib/ai/markdownText.ts";

test("repairs missing LaTeX command backslashes inside math", () => {
  const input = [
    "- Glucose",
    "  $mathrmC_6H_12O_6$",
    "",
    "$$",
    "6 , mathrmCO_2 + 6 , mathrmH_2O + light rightarrow mathrmC_6H_12O_6 + 6 , mathrmO_2",
    "$$",
  ].join("\n");

  assert.equal(
    normalizeMathDelimiters(input),
    [
      "- Glucose",
      "  $\\mathrm{C_6H_12O_6}$",
      "",
      "$$",
      "6 \\, \\mathrm{CO_2} + 6 \\, \\mathrm{H_2O} + light \\rightarrow \\mathrm{C_6H_12O_6} + 6 \\, \\mathrm{O_2}",
      "$$",
    ].join("\n"),
  );
});

test("preserves already-valid math and code spans", () => {
  const input = [
    "Water is $\\mathrm{H_2O}$.",
    "`$mathrmH_2O$`",
    "```",
    "$mathrmCO_2$",
    "```",
  ].join("\n");

  assert.equal(normalizeMathDelimiters(input), input);
});

test("wraps bare braced LaTeX commands outside math", () => {
  assert.equal(
    normalizeMathDelimiters("Sodium is \\mathrm{Na^+}."),
    "Sodium is $\\mathrm{Na^+}$.",
  );
});

test("wraps standalone trig-component equations when delimiters are omitted", () => {
  const input = [
    "So the tool is:",
    "",
    "- \\Delta x = 100\\cos(30^\\circ)",
    "- �y = 100\\sin(30^\\circ)",
  ].join("\n");

  assert.equal(
    normalizeMathDelimiters(input),
    [
      "So the tool is:",
      "",
      "- $\\Delta x = 100\\cos(30^\\circ)$",
      "- $\\Delta y = 100\\sin(30^\\circ)$",
    ].join("\n"),
  );
});

test("does not turn prose containing a LaTeX command into math", () => {
  const input = "Use \\Delta x = 10 in the next step.";
  assert.equal(normalizeMathDelimiters(input), input);
});

test("collapses redundant nested math delimiters", () => {
  assert.equal(
    normalizeMathDelimiters("\\($v_x = 2t^2\\,\\text{m/s}$\\)"),
    "$v_x = 2t^2\\,\\text{m/s}$",
  );
  assert.equal(
    normalizeMathDelimiters("\\[$$x = 1$$\\]"),
    "\n\n$$\nx = 1\n$$\n\n",
  );
});

test("renders existing delimited equations without a KaTeX error", () => {
  const markup = renderToStaticMarkup(
    createElement(AiMarkdown, null, "$v_x = 2t^2\\,\\text{m/s}$"),
  );

  assert.match(markup, /class="katex"/);
  assert.doesNotMatch(markup, /katex-error/);
});

test("renders formerly nested equations without a KaTeX error", () => {
  const markup = renderToStaticMarkup(
    createElement(AiMarkdown, null, "\\($v_x = 2t^2\\,\\text{m/s}$\\)"),
  );

  assert.match(markup, /class="katex"/);
  assert.doesNotMatch(markup, /katex-error/);
});

test("renders the trig equations from the guided-session regression", () => {
  const messages = [
    "$y = 100\\cos(30^\\circ)$",
    "$x = 100\\sin(30^\\circ)$",
    "$x = -100\\sin(30^\\circ)\\quad y = -100\\cos(30^\\circ)$",
  ];

  for (const message of messages) {
    const markup = renderToStaticMarkup(
      createElement(AiMarkdown, null, message),
    );
    assert.match(markup, /class="katex"/);
    assert.doesNotMatch(markup, /katex-error/);
  }
});

test("renders alternate display delimiters from stored tutor messages", () => {
  const message = [
    "The y-component uses cosine:",
    "\\[",
    "y = 100\\cos(30^\\circ)",
    "\\]",
    "The x-component uses sine:",
    "\\[",
    "x = 100\\sin(30^\\circ)",
    "\\]",
  ].join("\n");
  const normalizedMessage = normalizeMathDelimiters(message);
  assert.match(normalizedMessage, /\$\$\ny = 100\\cos\(30\^\\circ\)\n\$\$/);
  assert.match(normalizedMessage, /\$\$\nx = 100\\sin\(30\^\\circ\)\n\$\$/);
  assert.doesNotMatch(normalizedMessage, /\$\$\n\$/);
  const markup = renderToStaticMarkup(
    createElement(AiMarkdown, null, message),
  );

  assert.match(markup, /class="katex-display"/);
  assert.doesNotMatch(markup, /katex-error/);
});

test("repairs JSON control escapes and display math fences", () => {
  const input = "$$\nC_6H_{12}O_6 + 6O_2 \rightarrow 6CO_2 + 6H_2O + \text{about }30\text{-}32 ATP$$";

  assert.equal(
    normalizeMathDelimiters(input),
    "$$\nC_6H_{12}O_6 + 6O_2 \\rightarrow 6CO_2 + 6H_2O + \\text{about }30\\text{-}32 ATP\n$$",
  );

  assert.equal(
    normalizeMathDelimiters("$A \\ightarrow B$"),
    "$A \\rightarrow B$",
  );
  assert.equal(normalizeMathDelimiters("plain\ttext"), "plain\ttext");
});
