const bareLatexCommands = new Set([
  "bar",
  "dfrac",
  "frac",
  "hat",
  "mathbf",
  "mathit",
  "mathrm",
  "mathsf",
  "mathtt",
  "operatorname",
  "overline",
  "sqrt",
  "text",
  "textbf",
  "textit",
  "textrm",
  "tfrac",
  "underline",
  "vec",
  "widehat",
]);

const mathCommandNames = [
  ...bareLatexCommands,
  "Delta",
  "Gamma",
  "Lambda",
  "Omega",
  "Phi",
  "Pi",
  "Psi",
  "Rightarrow",
  "Sigma",
  "Theta",
  "Upsilon",
  "Xi",
  "alpha",
  "approx",
  "beta",
  "cdot",
  "chi",
  "delta",
  "div",
  "epsilon",
  "eta",
  "gamma",
  "geq",
  "infty",
  "lambda",
  "left",
  "leftarrow",
  "leq",
  "mu",
  "neq",
  "omega",
  "phi",
  "pi",
  "pm",
  "psi",
  "rho",
  "right",
  "rightarrow",
  "sigma",
  "tau",
  "theta",
  "times",
  "to",
  "upsilon",
  "xi",
].sort((first, second) => second.length - first.length);

const missingMathCommandPattern = new RegExp(
  `(^|[^\\\\A-Za-z])(${mathCommandNames.map(escapeRegex).join("|")})(?=\\s*(?:[\\{\\[]|\\b))`,
  "g",
);

/**
 * Keep AI-generated math renderable when the model drifts from exact KaTeX:
 * normalize alternate delimiters, repair known commands inside delimited math,
 * and wrap known bare commands while leaving code untouched.
 */
export function normalizeMathDelimiters(content: string) {
  return content
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g)
    .map((segment, index) => {
      if (index % 2 === 1) return segment;

      const normalizedDelimiters = segment
        .replace(
          /\\\[([\s\S]*?)\\\]/g,
          (_match, expression: string) =>
            `\n\n$$\n${expression.trim()}\n$$\n\n`,
        )
        .replace(
          /\\\(([\s\S]*?)\\\)/g,
          (_match, expression: string) => `$${expression.trim()}$`,
        );

      return wrapBareLatexCommands(
        restoreDelimitedLatexCommands(normalizedDelimiters),
      );
    })
    .join("");
}

function restoreDelimitedLatexCommands(content: string) {
  let result = "";
  let index = 0;

  while (index < content.length) {
    const delimiter = readMathDelimiter(content, index);

    if (!delimiter) {
      result += content[index];
      index += 1;
      continue;
    }

    const expressionStart = index + delimiter.length;
    const expressionEnd = findClosingMathDelimiter(
      content,
      expressionStart,
      delimiter,
    );

    if (expressionEnd === -1) {
      result += content[index];
      index += 1;
      continue;
    }

    result += delimiter;
    result += restoreMissingLatexBackslashes(
      content.slice(expressionStart, expressionEnd),
    );
    result += delimiter;
    index = expressionEnd + delimiter.length;
  }

  return result;
}

function restoreMissingLatexBackslashes(expression: string) {
  return expression
    .replace(/(^|[^\\A-Za-z])(mathrm)(?=\s*(?:\{|[A-Z]))/g, "$1\\$2")
    .replace(missingMathCommandPattern, "$1\\$2")
    .replace(
      /\\mathrm(?!\s*\{)\s*([A-Z][A-Za-z0-9_{}]*)/g,
      (_match, formula: string) => `\\mathrm{${formula}}`,
    )
    .replace(
      /([A-Za-z0-9}\]])\s+,\s+(?=\\(?:mathrm|mathbf|mathit|mathsf|mathtt|operatorname|text)\s*\{)/g,
      "$1 \\, ",
    );
}

function wrapBareLatexCommands(content: string) {
  let result = "";
  let index = 0;
  let mathDelimiter: "$" | "$$" | null = null;

  while (index < content.length) {
    const delimiter = readMathDelimiter(content, index);

    if (delimiter) {
      if (mathDelimiter === null || mathDelimiter === delimiter) {
        mathDelimiter = mathDelimiter === null ? delimiter : null;
      }

      result += delimiter;
      index += delimiter.length;
      continue;
    }

    if (mathDelimiter === null && content[index] === "\\") {
      const commandEnd = findLatexCommandEnd(content, index);

      if (commandEnd > index) {
        result += `$${content.slice(index, commandEnd)}$`;
        index = commandEnd;
        continue;
      }
    }

    result += content[index];
    index += 1;
  }

  return result;
}

function findLatexCommandEnd(content: string, start: number) {
  const commandMatch = content.slice(start + 1).match(/^[A-Za-z]+/);

  if (!commandMatch || !bareLatexCommands.has(commandMatch[0])) return start;

  let cursor = start + 1 + commandMatch[0].length;

  while (content[cursor] === " ") cursor += 1;

  if (commandMatch[0] === "sqrt" && content[cursor] === "[") {
    cursor = consumeBalancedGroup(content, cursor, "[", "]");
    if (cursor === -1) return start;
  }

  const requiredGroups = ["frac", "dfrac", "tfrac"].includes(commandMatch[0])
    ? 2
    : 1;

  for (let group = 0; group < requiredGroups; group += 1) {
    while (content[cursor] === " ") cursor += 1;
    if (content[cursor] !== "{") return start;

    cursor = consumeBalancedGroup(content, cursor, "{", "}");
    if (cursor === -1) return start;
  }

  while (content[cursor] === "_" || content[cursor] === "^") {
    cursor += 1;

    if (content[cursor] === "{") {
      cursor = consumeBalancedGroup(content, cursor, "{", "}");
      if (cursor === -1) return start;
    } else if (cursor < content.length) {
      cursor += 1;
    }
  }

  return cursor;
}

function consumeBalancedGroup(
  content: string,
  start: number,
  openingCharacter: string,
  closingCharacter: string,
) {
  let depth = 0;

  for (let index = start; index < content.length; index += 1) {
    if (content[index] === openingCharacter && !isEscaped(content, index)) {
      depth += 1;
    } else if (
      content[index] === closingCharacter &&
      !isEscaped(content, index)
    ) {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  return -1;
}

function findClosingMathDelimiter(
  content: string,
  start: number,
  delimiter: "$" | "$$",
) {
  for (let index = start; index < content.length; index += 1) {
    if (content.startsWith(delimiter, index) && !isEscaped(content, index)) {
      return index;
    }
  }

  return -1;
}

function readMathDelimiter(content: string, index: number): "$" | "$$" | null {
  if (content[index] !== "$" || isEscaped(content, index)) return null;

  return content[index + 1] === "$" ? "$$" : "$";
}

function isEscaped(content: string, index: number) {
  let slashCount = 0;

  for (let cursor = index - 1; cursor >= 0 && content[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }

  return slashCount % 2 === 1;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
