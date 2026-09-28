import { describe, expect, it } from 'vitest';
import { getExamBoundary, type CourseSequenceItem } from '@/lib/planner/courseSequence';
import { previewBalancedStudyPlan, type SyllabusStudyPlanInput } from '@/lib/syllabus/scheduling';
import { previewCatchUp } from '@/lib/planner/catchUp';
import { defaultPlanningPreferences } from '@/lib/planner/preferences';
import type { PlannerWorkspace } from '@/lib/planner/types';

const today = '2026-09-01';
const exam: CourseSequenceItem = { id: 'exam', classId: 'physics', title: 'Midterm 1', kind: 'exam', dueDate: '2026-09-15', notes: 'Covers Problem Sets 1 and 2.' };
const ps3: CourseSequenceItem = { id: 'ps3', classId: 'physics', title: 'Problem Set 3', kind: 'assignment', dueDate: '2026-09-23' };
const ps2: CourseSequenceItem = { ...ps3, id: 'ps2', title: 'Problem Set 2', dueDate: '2026-09-10' };

function planItems(items: CourseSequenceItem[]): SyllabusStudyPlanInput[] {
  return items.map(item => ({ itemId: item.id, classId: item.classId, item: {
    title: item.title, kind: item.kind === 'exam' ? 'exam' : 'assignment', dueDate: item.dueDate,
    difficulty: 'hard', points: 40, notes: item.notes ?? '',
  } }));
}

describe('course-aware exam boundaries', () => {
  it('keeps all four PS3 sessions after Midterm 1, with exam review before it', () => {
    const result = previewBalancedStudyPlan(planItems([ps3, exam, ps2]), { fromDate: today });
    expect(result.conflicts).toEqual([]);
    const later = result.sessions.filter(s => s.itemId === 'ps3');
    expect(later).toHaveLength(4);
    expect(later.every(s => s.scheduledDate > exam.dueDate! && s.scheduledDate < ps3.dueDate!)).toBe(true);
    expect(later.every(s => s.reason?.includes('Midterm 1'))).toBe(true);
    expect(result.sessions.filter(s => s.itemId === 'exam').every(s => s.scheduledDate < exam.dueDate!)).toBe(true);
    expect(result.sessions.filter(s => s.itemId === 'ps2').every(s => s.scheduledDate < ps2.dueDate!)).toBe(true);
  });

  it.each(['Covers Problem Sets 1–2.', 'Coverage: PS 1 through 2.', 'Includes Problem Set 1 and Problem Set 2.'])('recognizes explicit numbered coverage: %s', notes => {
    expect(getExamBoundary(ps3, [{ ...exam, notes }], today)?.earliestDate).toBe('2026-09-16');
  });

  it('uses course order when coverage is absent, without inventing coverage from the exam number', () => {
    const noCoverage = { ...exam, notes: '' };
    expect(getExamBoundary(ps3, [noCoverage], today)).toBeNull();
    expect(getExamBoundary(ps3, [noCoverage, ps2], today)?.earliestDate).toBe('2026-09-16');
  });

  it('honors explicit coverage that includes later-due coursework', () => {
    const covered = { ...exam, notes: 'Covers Problem Sets 1, 2, and 3.' };
    expect(getExamBoundary(ps3, [covered, ps2], today)).toBeNull();
    const result = previewBalancedStudyPlan(planItems([ps3, covered, ps2]), { fromDate: today });
    expect(result.sessions.some(s => s.itemId === 'ps3' && s.scheduledDate < exam.dueDate!)).toBe(true);
  });

  it('does not block unrelated classes, projects, completed exams, or work due before the exam', () => {
    expect(getExamBoundary(ps3, [{ ...exam, classId: 'chemistry' }], today)).toBeNull();
    expect(getExamBoundary({ ...ps3, title: 'Research Project 3' }, [exam], today)).toBeNull();
    expect(getExamBoundary(ps3, [{ ...exam, status: 'completed' }], today)).toBeNull();
    expect(getExamBoundary({ ...ps3, dueDate: exam.dueDate }, [exam], today)).toBeNull();
    expect(getExamBoundary(ps3, [exam], '2026-09-16')).toBeNull();
    expect(getExamBoundary({ ...ps3, dueDate: null }, [exam], today)).toBeNull();
    expect(getExamBoundary(ps3, [{ ...exam, kind: undefined, title: 'Final Research Project', notes: '' }, ps2], today)).toBeNull();
    expect(getExamBoundary(ps3, [{ ...exam, notes: 'Covers Problem Sets 9999999999999999999.' }], today)).toBeNull();
  });

  it('uses the latest relevant exam, including one happening today', () => {
    const second = { ...exam, id: 'exam2', title: 'Midterm 2', dueDate: '2026-09-18' };
    expect(getExamBoundary(ps3, [exam, second], '2026-09-18')?.earliestDate).toBe('2026-09-19');
  });

  it('flags insufficient post-exam capacity without moving work before the exam or dropping sessions silently', () => {
    const result = previewBalancedStudyPlan(planItems([{ ...ps3, dueDate: '2026-09-18' }, exam]), { fromDate: today });
    const later = result.sessions.filter(s => s.itemId === 'ps3');
    const conflicts = result.conflicts.filter(c => c.itemId === 'ps3');
    expect(later).toHaveLength(2);
    expect(conflicts).toHaveLength(2);
    expect(later.every(s => s.scheduledDate > exam.dueDate!)).toBe(true);
    expect(conflicts.every(c => c.reason.includes('Midterm 1'))).toBe(true);
  });

  it('respects days off and occupied post-exam days rather than borrowing earlier capacity', () => {
    const result = previewBalancedStudyPlan(planItems([ps3]), {
      fromDate: today, courseContext: [exam], existingTaskCounts: { '2026-09-16': 3 },
      preferences: { ...defaultPlanningPreferences, unavailableDates: ['2026-09-17'] },
    });
    expect(result.conflicts).toEqual([]);
    expect(result.sessions.every(s => s.scheduledDate >= '2026-09-18')).toBe(true);
  });

  it('repairs existing PS3 tasks while preserving pinned work and legacy exam recognition', () => {
    const state: PlannerWorkspace = {
      version: 'v1', preferences: defaultPlanningPreferences, sessions: [], lastChangeId: null,
      assignments: [ps3, exam, ps2].map(item => ({
        id: item.id, class_id: item.classId, title: item.title, due_date: item.dueDate,
        status: 'not_started', context_version: 0, importance: 'medium', description: item.notes,
      })),
      tasks: [false, true].map((pinned, index) => ({
        id: String(index), assignment_id: ps3.id, class_id: ps3.classId, user_id: 'user', title: `PS3 step ${index}`,
        description: null, scheduled_date: `2026-09-0${index + 2}`, priority: 'medium', status: 'todo',
        source: 'generic_generated', context_version: 0, user_edited: false, pinned, checklist: [],
      })),
    };
    // Put the protected milestone before the editable one, so it is not a
    // separate impossible ordering constraint for this repair.
    state.tasks[1].scheduled_date = today;
    const result = previewCatchUp(state, today, defaultPlanningPreferences);
    expect(result.conflicts).toEqual([]);
    expect(result.changes).toHaveLength(1);
    expect(result.changes?.[0].after?.scheduled_date).toBe('2026-09-16');
    expect(result.protectedCount).toBe(1);
    expect(result.blocks[0].reason).toContain('Midterm 1');
  });
});
