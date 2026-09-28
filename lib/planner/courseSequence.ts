import { addPlanningDays, dateOnlySchema } from './preferences';
import type { PlannerAssignment } from './types';

export type CourseSequenceItem = {
  id: string;
  classId: string;
  title: string;
  dueDate: string | null;
  kind?: string | null;
  notes?: string | null;
  status?: string;
};

export type ExamBoundary = { earliestDate: string; reason: string };

// Restrict chronological inference to recurring coursework, not projects or papers
// whose preparation can legitimately span several assessments.
const courseworkLabel = String.raw`(?:problem\s*sets?|p\s*sets?|ps|homeworks?|hw)`;
const numberedCoursework = new RegExp(String.raw`^\s*(${courseworkLabel})\s*(?:\#|no\.?\s*)?\s*(\d+)\b`, 'i');

function coursework(title: string) {
  const match = title.match(numberedCoursework);
  if (!match) return null;
  return { family: /^(?:homework|hw)/i.test(match[1]) ? 'homework' : 'problem-set', number: Number(match[2]) };
}

function isExam(item: CourseSequenceItem) {
  return item.kind ? item.kind === 'exam'
    : /\b(?:midterm|exam(?:ination)?)\b/i.test(item.title) || /^\s*final\s*$/i.test(item.title);
}

// Only interpret explicit coverage clauses. Unrelated numbers, dates, and points
// in an exam description must never become assignment dependencies.
function coveredCoursework(exam: CourseSequenceItem, family: string) {
  const text = `${exam.title}. ${exam.notes ?? ''}`;
  const clauses = text.matchAll(/\b(?:covers?|covering|coverage\s*:|includes?)\s+([^.;\n]+)/gi);
  const numbers = new Set<number>();
  for (const clause of clauses) {
    const references = clause[1].matchAll(new RegExp(String.raw`(${courseworkLabel})\s*(?:\#|no\.?\s*)?\s*(\d+(?:\s*(?:[-–—]|through|to|,\s*(?:and\s+)?|and|&)\s*\#?\s*\d+)*)`, 'gi'));
    for (const reference of references) {
      if (coursework(`${reference[1]} 1`)?.family !== family) continue;
      const parts = reference[2].matchAll(/(\d+)(?:\s*(?:[-–—]|through|to)\s*(\d+))?/gi);
      for (const part of parts) {
        const start = Number(part[1]);
        const end = Number(part[2] ?? part[1]);
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start || end - start > 200) continue;
        for (let number = start; number <= end; number++) numbers.add(number);
      }
    }
  }
  return numbers;
}

export function getExamBoundary(item: CourseSequenceItem, courseItems: CourseSequenceItem[], today: string): ExamBoundary | null {
  const sequence = coursework(item.title);
  if (!sequence || isExam(item) || !item.dueDate || !dateOnlySchema.safeParse(item.dueDate).success) return null;
  const peers = courseItems.filter(peer => peer.classId === item.classId && peer.id !== item.id);
  const boundaries = peers.filter(exam => {
    if (!isExam(exam) || exam.status === 'completed' || !exam.dueDate
      || !dateOnlySchema.safeParse(exam.dueDate).success || exam.dueDate < today || exam.dueDate >= item.dueDate!) return false;
    const covered = coveredCoursework(exam, sequence.family);
    if (covered.size) return sequence.number > Math.max(...covered);
    // Without explicit coverage, an exam between earlier and later numbered
    // coursework is a course-phase boundary, not a claim about exam content.
    return peers.some(previous => {
      const earlier = coursework(previous.title);
      return !isExam(previous) && earlier?.family === sequence.family && earlier.number < sequence.number
        && previous.dueDate && dateOnlySchema.safeParse(previous.dueDate).success && previous.dueDate <= exam.dueDate!;
    });
  }).sort((a, b) => b.dueDate!.localeCompare(a.dueDate!) || a.id.localeCompare(b.id));
  const exam = boundaries[0];
  return exam ? {
    earliestDate: addPlanningDays(exam.dueDate!, 1),
    reason: `Start after ${exam.title} (${exam.dueDate}) to keep later coursework behind the exam.`,
  } : null;
}

export function plannerCourseItems(assignments: PlannerAssignment[]): CourseSequenceItem[] {
  return assignments.filter(a => a.class_id !== null).map(a => ({
    id: a.id, classId: a.class_id!, title: a.title, dueDate: a.due_date,
    kind: a.deadline_evidence?.kind, notes: a.description, status: a.status,
  }));
}
