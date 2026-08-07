import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { generateFlashcardsFromText } from "@/lib/ai/flashcards";
import { analyzeSyllabusText } from "@/lib/ai/syllabus";

const assignmentExpectationSchema = z.strictObject({
  titleIncludes: z.string().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["assignment", "exam", "quiz"]),
});

const syllabusCaseSchema = z.strictObject({
  id: z.string().min(1),
  workflow: z.literal("syllabus_analysis"),
  input: z.strictObject({
    originalFileName: z.string().min(1),
    existingClasses: z.array(
      z.strictObject({
        id: z.string().min(1),
        name: z.string().nullable(),
        classCode: z.string().nullable(),
      }),
    ),
    text: z.string().min(1),
  }),
  expected: z.strictObject({
    classCode: z.string().min(1),
    instructorIncludes: z.string().min(1),
    matchedClassId: z.string().min(1),
    assignments: z.array(assignmentExpectationSchema).min(1),
  }),
});

const flashcardCaseSchema = z.strictObject({
  id: z.string().min(1),
  workflow: z.literal("flashcards"),
  input: z.strictObject({
    cardCount: z.number().int().min(1).max(50),
    text: z.string().min(1),
  }),
  expected: z.strictObject({
    conceptGroups: z.array(z.array(z.string().min(1)).min(1)).min(1),
  }),
});

const datasetSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceArtifacts: z.array(z.string().min(1)).min(1),
  cases: z
    .array(z.discriminatedUnion("workflow", [
      syllabusCaseSchema,
      flashcardCaseSchema,
    ]))
    .min(1),
});

type EvalCase = z.infer<typeof datasetSchema>["cases"][number];

const datasetPath = fileURLToPath(
  new URL("./representative-cases.json", import.meta.url),
);
const dataset = datasetSchema.parse(
  JSON.parse(readFileSync(datasetPath, "utf8")),
);
const missingSources = dataset.sourceArtifacts.filter(
  (sourcePath) => !existsSync(sourcePath),
);

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  if (missingSources.length > 0) {
    throw new Error(
      `Evaluation source artifacts are missing: ${missingSources.join(", ")}`,
    );
  }

  if (process.argv.includes("--validate-only")) {
    console.log(
      JSON.stringify({
        event: "ai.eval_dataset.validated",
        caseCount: dataset.cases.length,
        sourceArtifactCount: dataset.sourceArtifacts.length,
        workflows: [
          ...new Set(dataset.cases.map((testCase) => testCase.workflow)),
        ],
      }),
    );
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to run live AI evaluations.");
  }

  const requestedCaseId = getArgumentValue("--case");
  const cases = requestedCaseId
    ? dataset.cases.filter((testCase) => testCase.id === requestedCaseId)
    : dataset.cases;

  if (cases.length === 0) {
    throw new Error(`No evaluation case found with id ${requestedCaseId}.`);
  }

  const results = [];
  for (const testCase of cases) {
    const result = await runCase(testCase);
    results.push(result);
    console.log(JSON.stringify({ event: "ai.eval_case", ...result }));
  }

  const meanScore = average(results.map((result) => result.score));
  const passRate = average(results.map((result) => Number(result.passed)));
  const summary = {
    event: "ai.eval_summary",
    caseCount: results.length,
    meanScore: round(meanScore),
    passRate: round(passRate),
    passed: results.every((result) => result.passed),
  };
  console.log(JSON.stringify(summary));

  if (!summary.passed) process.exitCode = 1;
}

async function runCase(testCase: EvalCase) {
  const startedAt = Date.now();

  if (testCase.workflow === "syllabus_analysis") {
    const output = await analyzeSyllabusText(testCase.input);
    const checks: Record<string, boolean> = {
      classCode:
        normalize(output.course.classCode ?? "")
        === normalize(testCase.expected.classCode),
      instructor: normalize(output.course.instructor ?? "").includes(
        normalize(testCase.expected.instructorIncludes),
      ),
      matchedClassId:
        output.matchedClassId === testCase.expected.matchedClassId,
    };

    testCase.expected.assignments.forEach((expected, index) => {
      const assignment = output.assignments.find((candidate) =>
        normalize(candidate.title).includes(normalize(expected.titleIncludes)),
      );
      checks[`assignment_${index + 1}_found`] = Boolean(assignment);
      checks[`assignment_${index + 1}_date`] =
        assignment?.dueDate === expected.dueDate;
      checks[`assignment_${index + 1}_kind`] =
        assignment?.kind === expected.kind;
    });

    return getCaseResult(testCase, checks, startedAt);
  }

  const output = await generateFlashcardsFromText(
    testCase.input.text,
    testCase.input.cardCount,
  );
  const searchableOutput = normalize(
    [
      output.title,
      ...output.cards.flatMap((card) => [card.question, card.answer]),
    ].join(" "),
  );
  const checks: Record<string, boolean> = {
    exactCardCount: output.cards.length === testCase.input.cardCount,
    nonEmptyTitle: output.title.trim().length > 0,
    conciseAnswers: output.cards.every((card) => card.answer.length <= 1_500),
  };

  testCase.expected.conceptGroups.forEach((conceptGroup, index) => {
    checks[`concept_${index + 1}`] = conceptGroup.some((concept) =>
      searchableOutput.includes(normalize(concept)),
    );
  });

  return getCaseResult(testCase, checks, startedAt);
}

function getCaseResult(
  testCase: EvalCase,
  checks: Record<string, boolean>,
  startedAt: number,
) {
  const score = average(Object.values(checks).map(Number));
  return {
    id: testCase.id,
    workflow: testCase.workflow,
    score: round(score),
    passed: score >= 0.85,
    latencyMs: Date.now() - startedAt,
    checks,
  };
}

function getArgumentValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Number(value.toFixed(4));
}
