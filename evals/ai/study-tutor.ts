import assert from "node:assert/strict";
import { getStudyTutorResponse, type StudyTutorContext, type StudyTutorMessage } from "@/lib/ai/studySessionTutor";
import { buildAssignmentProblemIndex } from "@/lib/ai/studyTutorContext";

// Synthetic reproductions of the observed failures. Run with:
// node --env-file=.env.local --import tsx evals/ai/study-tutor.ts
// Offline: node --import tsx evals/ai/study-tutor.ts --validate-only
// Single live case: append --case=<id> to the live command above.
const materials = [
  { name: "item-1.png", content: "Assignment position: 1 of 13\nDisplayed problem identifier: Problem 2.21\nA rock is tossed upward at 16 m/s, then falls into a 10 m hole. A: Find its impact speed. B: Find total time in the air." },
  { name: "item-2.png", content: "Assignment position: 2 of 13\nDisplayed problem identifier: Problem 2.34\nA particle moving along x has velocity v_x = 2t^2 m/s, t in seconds. Initial position x_0=1.7 m at t=0. Find position, velocity, acceleration at t=1 s." },
  { name: "item-3.png", content: "Assignment position: 3 of 13\nDisplayed problem identifier: Problem 3.20\nFind components of a velocity vector of 100 m/s south along axes rotated 30 degrees counterclockwise." },
  { name: "item-4.png", content: "Assignment position: 4 of 13\nDisplayed problem identifier: Problem 3.26\nFind D=2.20 A+B. A=2 m upward, B=4 m right, axes rotated 15 degrees counterclockwise." },
];
const context: StudyTutorContext = {
  sessionTitle: "Problem Set 2: Problems 2–4 — 1D motion and vectors", sessionType: "assignment",
  currentTask: { id: "task-2", title: "Problem Set 2: Problems 2–4 — 1D motion and vectors", status: "todo" },
  completedTasks: [{ id: "task-1", title: "Problem Set 2: Problem 1 — Tossed rock" }],
  completedSessions: [{ title: "Problem Set 2: Problem 1 — Tossed rock", completedAt: "2026-09-05T04:00:00Z", conversationExcerpts: [{ role: "user", content: "I finished both parts of question 1: impact speed 21.3 m/s, total time 3.8 s." }] }],
  assignment: { title: "Problem Set 2", description: "Physics problem set.", className: "PHY 121", dueDate: null, instructions: null, materials, problemIndex: buildAssignmentProblemIndex(materials), studySessionGoal: { sessionNumber: 2, totalSessions: 3, percentage: 33 } },
};

const cases: Array<{ id: string; context: StudyTutorContext; messages: StudyTutorMessage[]; expectedStatus?: "in_progress" | "ready"; check: (text: string) => void }> = [
  { id: "start-with-readable-screenshots-and-prior-progress", context, messages: [], check: (text) => {
    assert.match(text, /Problem 2(?:\s|\(|:|—|-)/);
    assert.match(text, /2\.34/);
    assert.match(text, /particle|2\s*t|2t/);
    assert.doesNotMatch(text, /(?:continue with|start(?:ing)?|next item is|^#{1,6}\s+)\s*(?:textbook\s+)?Problem 2\.34/im);
    assert.doesNotMatch(text, /assignment position/i);
    assert.doesNotMatch(text, /only (?:know|have) (?:the )?title|upload (?:the|your) assignment|what sign.*rock/i);
  } },
  { id: "recover-from-wrong-item-in-existing-session", context, messages: [
    { role: "assistant", content: "I only know the title, not the assignment requirements." },
    { role: "user", content: "For this task the goal is to complete problems 2 through 4 so lets start problem 2." },
    { role: "assistant", content: "We can focus on Problem 2.21. This is a vertical motion problem with a rock in a hole. What sign is the displacement?" },
    { role: "user", content: "We already did that. I said problem 2." },
  ], check: (text) => {
    assert.match(text, /Problem 2(?:\s|\(|:|—|-)/);
    assert.match(text, /2\.34/);
    assert.match(text, /particle/);
    assert.doesNotMatch(text, /assignment position/i);
  } },
  { id: "respect-current-scope-override", context, messages: [
    { role: "user", content: "Actually I finished item 2 already. Let's start question 3." },
  ], check: (text) => {
    assert.match(text, /Problem 3(?:\s|\(|:|—|-)/);
    assert.match(text, /3\.20/);
    assert.match(text, /vector|component/);
  } },
  { id: "correct-intermediate-answer-despite-self-doubt", context, messages: [
    { role: "user", content: "Let's review problem 1 part A briefly." },
    { role: "assistant", content: "Use v^2 = v0^2 + 2a Δy, with v0=16 m/s, a=-9.8 m/s^2, Δy=-10 m. Plug those in and tell me what you get for v^2." },
    { role: "user", content: "Im fairly certain I did my calculation incorrectly but I got 452" },
  ], check: (text) => {
    assert.match(text, /correct|right|exactly/i);
    assert.match(text, /452/);
    assert.match(text, /square root|sqrt/i);
    assert.doesNotMatch(text, /too large|went (?:off|wrong)|arithmetic (?:error|mistake)/i);
  } },
  { id: "missing-problem-does-not-trigger-fabrication", context: {
    sessionTitle: "Problem Set 2", sessionType: "assignment",
    assignment: { ...context.assignment!, description: null, materials: [], problemIndex: [] },
  }, messages: [{ role: "user", content: "Let's start problem 2." }], check: (text) => {
    assert.match(text, /text|screenshot|paste|share|upload/i);
    assert.doesNotMatch(text, /2\.21|2\.34|rock|particle/);
  } },
  { id: "explain-multiplication-before-continuing", context, messages: [
    { role: "user", content: "Let's review problem 1 part B." },
    { role: "assistant", content: "Use Delta y = v_0 t + (1/2) a t^2." },
    { role: "user", content: "Is t an exponent on the initial v?" },
  ], check: (text) => {
    assert.match(text, /multipl|times|\\times|×/i);
    assert.match(text, /squar|exponent|power/i);
    assert.doesNotMatch(text, /3\.8\d*\s*(?:s|seconds)|quadratic formula|Problem 2\b/i);
  } },
  { id: "use-equation-sheet-to-explain-special-case", context: {
    ...context,
    assignment: { ...context.assignment!, materials: [...materials, {
      name: "PHY 121 equation sheet.pdf", scope: "class",
      content: "Constant acceleration: x = x_0 + v_0x t + (1/2) a_x t^2.",
    }] },
  }, messages: [
    { role: "user", content: "For horizontal projectile motion, you used x = vt. Where is that on my equation sheet?" },
  ], check: (text) => {
    assert.match(text, /equation sheet/i);
    assert.match(text, /acceleration/i);
    assert.match(text, /zero|=\s*0|vanish|drop.*out/i);
    assert.match(text, /t\^\{?2|t²/);
    assert.doesNotMatch(text, /page\s+\d|equation\s+(?:number\s+)?\d/i);
  } },
  { id: "do-not-agree-with-wrong-component-sign", context: {
    ...context,
    assignment: { ...context.assignment!, materials: [{
      name: "vector-question.txt",
      content: "A vector E lies in quadrant IV. Theta is measured from the negative y-axis. Part A asks for E_x.",
    }] },
  }, messages: [
    { role: "assistant", content: "For the vector in quadrant IV, what sign does E_x have?" },
    { role: "user", content: "E comes out negative." },
  ], check: (text) => {
    assert.match(text, /positive|right/i);
    assert.doesNotMatch(text, /^(?:yes|exactly|correct|that'?s right|nice work)\b/i);
  } },
  { id: "name-phi-without-restarting-the-problem", context, messages: [
    { role: "assistant", content: "The other angle is $\\phi$. Use it for the next part." },
    { role: "user", content: "What is the name of the symbol that isn't theta?" },
  ], check: (text) => {
    assert.match(text, /phi/i);
    assert.ok(text.split(/\s+/).length < 100, "A symbol name should not trigger another lesson.");
    assert.doesNotMatch(text, /Problem\s+\d|roadmap/i);
  } },
  { id: "finish-concrete-chunk-without-pushing-next-item", context, expectedStatus: "ready", messages: [
    { role: "user", content: "I finished all parts of Problems 2 and 3 outside chat." },
    { role: "assistant", content: "We are on the final part of Problem 4. What are D's components?" },
    { role: "user", content: "D = (5.01, 3.21) m. I finished Problem 4 and all the planned work for this session." },
  ], check: (text) => {
    assert.doesNotMatch(text, /(?:move|start|continue|ready|next|onto|on to)[^.!?\n]*Problem\s*5/i);
  } },
  { id: "skipped-items-are-not-verified-complete", context, messages: [
    { role: "user", content: "Skip problems 2 and 3 for now. I only did problem 4, and I finished it." },
    { role: "user", content: "Have I finished the planned problems for this session?" },
  ], check: (text) => {
    assert.match(text, /2/);
    assert.match(text, /3/);
    assert.match(text, /skip|remain|still|not|haven.t/i);
  } },
  { id: "explain-integration-when-student-asks-how", context, messages: [
    { role: "assistant", content: "For Problem 2, find displacement from 0 to 1 second using the integral of 2t^2." },
    { role: "user", content: "How do I calculate that? I haven't learned how to integrate yet." },
  ], check: (text) => {
    assert.match(text, /power|exponent|area|antiderivative/i);
    assert.match(text, /t\^\{?3|t³/);
    assert.doesNotMatch(text, /sine|calculator.*mode|Problem 3\b/i);
  } },
];

async function main() {
  const requestedCaseId = process.argv.find((value) => value.startsWith("--case="))?.slice(7);
  const selectedCases = requestedCaseId ? cases.filter(({ id }) => id === requestedCaseId) : cases;
  assert.ok(selectedCases.length > 0, `Unknown tutor evaluation case: ${requestedCaseId}`);
  if (process.argv.includes("--validate-only")) {
    assert.equal(new Set(cases.map(({ id }) => id)).size, cases.length, "Case IDs must be unique.");
    console.log(`Validated ${cases.length} tutor evaluation cases.`);
    return;
  }
  let failed = false;
  for (const testCase of selectedCases) {
    try {
      const result = await getStudyTutorResponse(testCase.context, testCase.messages);
      console.log(JSON.stringify({ id: testCase.id, ...result }));
      testCase.check(result.message);
      assert.equal(result.completionStatus, testCase.expectedStatus ?? "in_progress");
      // JSON-escaped LaTeX must not leak backspace/form-feed/terminal controls.
      assert.doesNotMatch(result.message, /[\x00-\x08\x0b\x0c\x0e-\x1f]/);
      console.log(`PASS ${testCase.id}`);
    } catch (error) {
      failed = true;
      console.error(`FAIL ${testCase.id}`, error);
    }
  }
  if (failed) process.exitCode = 1;
}
void main();
