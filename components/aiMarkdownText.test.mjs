import { test } from "vitest";
import assert from "node:assert/strict";

import { normalizeMathDelimiters } from "./aiMarkdownText.ts";

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
