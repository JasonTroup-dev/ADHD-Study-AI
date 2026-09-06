import assert from "node:assert/strict";
import { getStudyTutorResponse, type StudyTutorContext, type StudyTutorMessage } from "@/lib/ai/studySessionTutor";
import { buildAssignmentProblemIndex } from "@/lib/ai/studyTutorContext";

// Synthetic reproductions of the observed failures. Run with:
// node --env-file=.env.local --import tsx evals/ai/study-tutor.ts
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

const cases: Array<{ id: string; context: StudyTutorContext; messages: StudyTutorMessage[]; check: (text: string) => void }> = [
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
];

async function main() {
  let failed = false;
  for (const testCase of cases) {
    try {
      const result = await getStudyTutorResponse(testCase.context, testCase.messages);
      console.log(JSON.stringify({ id: testCase.id, ...result }));
      testCase.check(result.message);
      assert.equal(result.completionStatus, "in_progress");
      console.log(`PASS ${testCase.id}`);
    } catch (error) {
      failed = true;
      console.error(`FAIL ${testCase.id}`, error);
    }
  }
  if (failed) process.exitCode = 1;
}
void main();
