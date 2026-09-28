import { describe, expect, it } from 'vitest';
import { previewBalancedStudyPlan, createBalancedStudyPlan, StudyPlanCapacityError } from '@/lib/syllabus/scheduling';
import { defaultPlanningPreferences, capacityOnDate } from '@/lib/planner/preferences';
import { previewCatchUp } from '@/lib/planner/catchUp';
import { getAssignmentDateEvidence, getSyllabusDateEvidence } from '@/lib/syllabus/dateEvidence';
import { verifyWorkBreakdown } from '@/lib/ai/workBreakdown';
import type { PlannerTask, PlannerWorkspace } from '@/lib/planner/types';
const prefs = { ...defaultPlanningPreferences, maxTasksPerDay: 1, weekdayCapacity: [1,1,1,1,1,1,1] };
const assignment = (id: string, date = '2026-09-09') => ({ itemId:id, item:{ title:`Assignment ${id}`, kind:'assignment' as const, dueDate:date, difficulty:'easy' as const, points:10 } });
const task = (id: string, date: string, patch: Partial<PlannerTask> = {}): PlannerTask => ({ id,user_id:'user',assignment_id:id,class_id:'class',title:id,description:null,scheduled_date:date,priority:'medium',status:'todo',source:'generic_generated',context_version:0,user_edited:false,pinned:false,checklist:[],...patch });
const workspace = (tasks: PlannerTask[]): PlannerWorkspace => ({ version:'v',tasks,assignments:tasks.map(t => ({id:t.assignment_id!,title:t.title,due_date:'2026-09-20',status:'not_started',context_version:0,class_id:'class',importance:'medium'})),sessions:[],preferences:prefs,lastChangeId:null });
describe('adaptive scheduling', () => {
  it('reports impossible capacity instead of silently overbooking or dropping work', () => {
    const items = ['a','b','c'].map(id => assignment(id));
    const plan = previewBalancedStudyPlan(items,{fromDate:'2026-09-08',preferences:prefs});
    expect(plan.sessions).toHaveLength(1); expect(plan.conflicts).toHaveLength(2);
    expect(() => createBalancedStudyPlan(items,{fromDate:'2026-09-08',preferences:prefs})).toThrow(StudyPlanCapacityError);
  });
  it('honors days off and lighter weekdays across existing classes', () => {
    const availability = { ...prefs, unavailableDates:['2026-09-08'], weekdayCapacity:[0,1,1,0,1,1,0] };
    const plan = previewBalancedStudyPlan(['a','b'].map(id => assignment(id,'2026-09-18')),{fromDate:'2026-09-08',preferences:availability,existingTaskCounts:{'2026-09-10':1}});
    const counts: Record<string,number> = {'2026-09-10':1};
    for (const session of plan.sessions) counts[session.scheduledDate] = (counts[session.scheduledDate] ?? 0) + 1;
    expect(plan.conflicts).toHaveLength(0);
    for (const [date,count] of Object.entries(counts)) expect(count).toBeLessThanOrEqual(capacityOnDate(date,availability));
  });
  it('reports a fully unavailable week and preserves task order', () => {
    const plan = previewBalancedStudyPlan([assignment('a','2026-09-12')],{fromDate:'2026-09-08',preferences:{...prefs,weekdayCapacity:[0,0,0,0,0,0,0]}});
    expect(plan.sessions).toHaveLength(0); expect(plan.conflicts.length).toBeGreaterThan(0);
  });
  it('protects started, completed, pinned, edited, manual, and legacy-session tasks', () => {
    const state = workspace([task('move','2026-09-01'),task('pin','2026-09-09',{pinned:true}),task('done','2026-09-10',{status:'completed'}),task('edit','2026-09-11',{user_edited:true}),task('manual','2026-09-12',{source:'manual'}),task('started','2026-09-13'),task('legacy','2026-09-14')]);
    state.sessions = [{id:'s',planner_task_id:'started',assignment_id:'started'},{id:'l',planner_task_id:null,assignment_id:'legacy'}];
    const plan = previewCatchUp(state,'2026-09-08',prefs);
    expect(plan.changes?.map(c => c.before?.id)).toEqual(['move']);
    expect(plan.changes?.[0].after?.scheduled_date).toBe('2026-09-08');
    expect(plan.protectedCount).toBe(6);
  });
  it('keeps future work near its original date and labels missed deadlines', () => {
    const state = workspace([task('future','2026-09-18'),task('late','2026-09-01')]);
    state.assignments[1].due_date = '2026-09-03';
    const plan = previewCatchUp(state,'2026-09-08',prefs);
    expect(plan.blocks.find(b => b.id === 'future')?.scheduledDate).toBe('2026-09-18');
    expect(plan.blocks.find(b => b.id === 'late')?.reason).toContain('missed deadline');
  });
});
describe('grounded planning', () => {
  it('rejects a date copied from a neighboring assignment, even in a combined quote', () => {
    const source = 'Essay — October 4, 2026\nLab — October 8, 2026';
    expect(getAssignmentDateEvidence(source,'Essay','2026-10-08',source).status).toBe('missing');
    expect(getAssignmentDateEvidence(source,'Essay','2026-10-04').status).toBe('explicit');
  });
  it('verifies a following deadline line and rejects a conflicting printed year', () => {
    expect(getAssignmentDateEvidence('Essay\nDue: October 4, 2026','Essay','2026-10-04').status).toBe('explicit');
    expect(getSyllabusDateEvidence('October 4, 2025','2026-10-04')).toBe('missing');
  });
  it('accepts a grounded checklist and rejects fabricated evidence or duplicate steps', () => {
    const sources = [{name:'Instructions',text:'Compare two sources and write three supporting claims.'}];
    const proposal = {summary:'One concrete step.',tasks:[{title:'Compare sources',checklist:['Three claims are written.'],sourceName:'Instructions',sourceQuote:sources[0].text}]};
    expect(verifyWorkBreakdown(proposal,'Essay',sources).tasks[0].title).toBe('Essay: Compare sources');
    expect(() => verifyWorkBreakdown({...proposal,tasks:[{...proposal.tasks[0],sourceQuote:'Invented requirement'}]},'Essay',sources)).toThrow();
    expect(() => verifyWorkBreakdown({...proposal,tasks:[proposal.tasks[0],proposal.tasks[0]]},'Essay',sources)).toThrow();
  });
});
