import { readFile } from "node:fs/promises";

const summaryPath = new URL("../coverage/coverage-summary.json", import.meta.url);

try {
  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  const total = summary.total;

  console.log("## Unit and API coverage");
  console.log("");
  console.log("| Metric | Covered | Total | Percent |");
  console.log("| --- | ---: | ---: | ---: |");

  for (const metric of ["lines", "statements", "functions", "branches"]) {
    const value = total[metric];
    console.log(`| ${capitalize(metric)} | ${value.covered} | ${value.total} | ${value.pct}% |`);
  }

  console.log("");
  console.log("The full HTML and LCOV reports are attached to this workflow run as the `coverage-report` artifact.");
} catch (error) {
  console.log("## Unit and API coverage");
  console.log("");
  console.log(`Coverage results were not produced: ${error instanceof Error ? error.message : String(error)}`);
}

function capitalize(value) {
  return value[0].toUpperCase() + value.slice(1);
}
