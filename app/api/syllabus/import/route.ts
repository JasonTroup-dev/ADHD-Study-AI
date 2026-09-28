import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { classColorOptions } from '@/lib/classColors';
import { createClient } from '@/lib/supabase/server';
import { previewBalancedStudyPlan, getAssignmentImportance } from '@/lib/syllabus/scheduling';
import { countTasks } from '@/lib/planner/catchUp';
import { plannerCourseItems } from '@/lib/planner/courseSequence';
import { dateOnlySchema, planningPreferencesSchema } from '@/lib/planner/preferences';
import { commitPlannerChange, loadPlannerWorkspace, PlannerError } from '@/lib/planner/server';
import type { PlannerTask, PlannerPreview } from '@/lib/planner/types';

export const runtime = 'nodejs';
const assignmentSchema = z.object({
  title: z.string().trim().min(1).max(180), kind: z.enum(['assignment','exam','quiz']),
  dueDate: dateOnlySchema.nullable(), dueDateStatus: z.enum(['explicit','inferred','missing']),
  points: z.number().min(0).nullable(), difficulty: z.enum(['easy','medium','hard']),
  confidence: z.number().min(0).max(1), notes: z.string().max(500),
  sourceQuote: z.string().max(1500).nullable().optional(), dueDateOrigin: z.enum(['source','user']).optional(),
});
const requestSchema = z.object({
  action: z.enum(['preview','apply']).default('apply'), version: z.string().optional(),
  classId: z.string().uuid().optional(),
  newClass: z.object({ name: z.string().trim().min(1).max(180), classCode: z.string().trim().min(1).max(80),
    professorName: z.string().trim().min(1).max(180), color: z.string().refine(c => classColorOptions.some(v => v.value === c)) }).optional(),
  assignments: z.array(assignmentSchema).min(1).max(80), planningDate: dateOnlySchema,
  preferences: planningPreferencesSchema, maxTasksPerDay: z.number().optional(),
});
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: 'You must be signed in to build a plan.' }, { status: 401 });
  try {
    const input = requestSchema.parse(await request.json());
    const serverDate = new Date().toISOString().slice(0,10);
    if (Math.abs(Date.parse(input.planningDate) - Date.parse(serverDate)) > 86400000) throw new PlannerError('Your planning date changed. Reopen the planner.');
    if (input.assignments.some(a => a.dueDate && a.dueDate < input.planningDate)) throw new PlannerError('Review past-due assignments: update or clear their dates before importing.');
    if (input.assignments.some(a => a.dueDate && Number(a.dueDate.slice(0,4)) > Number(serverDate.slice(0,4)) + 2)) throw new PlannerError('Choose deadlines within the next two years.');
    const workspace = await loadPlannerWorkspace(supabase);
    const existingCounts = countTasks(workspace.tasks);
    const plan = previewBalancedStudyPlan(input.assignments.map((item,index) => ({ itemId: String(index), item, classId: input.classId ?? 'import' })),
      { fromDate: input.planningDate, existingTaskCounts: existingCounts, preferences: input.preferences,
        courseContext: plannerCourseItems(workspace.assignments) });
    const preview: PlannerPreview = {
      version: workspace.version, preferences: input.preferences, existingCounts, conflicts: plan.conflicts,
      blocks: plan.sessions.map((s,index) => ({ id: String(index), title: s.title, scheduledDate: s.scheduledDate,
        reason: s.reason ?? `Spread before ${input.assignments[Number(s.itemId)].dueDate}, around your existing blocks and availability.` })),
    };
    if (input.action === 'preview') return Response.json(preview);
    if (!input.version || input.version !== workspace.version) throw new PlannerError('Your planner changed. Preview the schedule again.', 409);
    if (plan.conflicts.length) return Response.json({ error: 'The work does not fit. Adjust availability or remove assignments, then preview again.', preview }, { status: 409 });
    if (Boolean(input.classId) === Boolean(input.newClass)) throw new PlannerError('Choose an existing class or create a new one.');
    const classId = input.classId ?? randomUUID();
    let className = input.newClass?.name ?? '';
    if (input.classId) {
      const { data, error } = await supabase.from('classes').select('name').eq('id', input.classId).eq('user_id', user.id).maybeSingle();
      if (error || !data) throw new PlannerError('The selected class could not be found.');
      className = data.name ?? 'Class';
    }
    const assignmentIds = input.assignments.map(() => randomUUID());
    const changes = plan.sessions.map(s => ({ before: null, after: {
      id: randomUUID(), user_id: user.id, class_id: classId, assignment_id: assignmentIds[Number(s.itemId)],
      title: s.title, description: null, scheduled_date: s.scheduledDate, priority: s.priority,
      status: 'todo', source: 'generic_generated', context_version: 0, user_edited: false, pinned: false, checklist: [],
    } satisfies PlannerTask }));
    await commitPlannerChange(supabase, {
      version: input.version, kind: 'import', changes, preferences: input.preferences,
      newClass: input.newClass ? { id: classId, ...input.newClass } : undefined,
      assignments: input.assignments.map((a,index) => ({ id: assignmentIds[index], class_id: classId, title: a.title,
        description: a.notes || null, due_date: a.dueDate, importance: getAssignmentImportance(a), points: a.points,
        deadline_evidence: { quote: a.sourceQuote ?? null, origin: a.dueDateOrigin ?? 'source', status: a.dueDateStatus, kind: a.kind } })),
    });
    return Response.json({ assignmentCount: input.assignments.length, studySessionCount: changes.length, classId, className, classCreated: Boolean(input.newClass) });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({ error: 'Review the assignment details and availability before continuing.' }, { status: 400 });
    if (error instanceof PlannerError) return Response.json({ error: error.message }, { status: error.status });
    console.error('Study plan import failed:', error);
    return Response.json({ error: 'The plan could not be saved. Please try again.' }, { status: 500 });
  }
}
