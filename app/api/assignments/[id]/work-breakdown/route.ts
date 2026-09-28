import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateWorkBreakdown, verifyWorkBreakdown, workBreakdownSchema } from '@/lib/ai/workBreakdown';
import { countTasks, isProtectedTask } from '@/lib/planner/catchUp';
import { getExamBoundary, plannerCourseItems } from '@/lib/planner/courseSequence';
import { addPlanningDays, capacityOnDate, dateOnlySchema, planningPreferencesSchema } from '@/lib/planner/preferences';
import { commitPlannerChange, loadPlannerWorkspace, PlannerError } from '@/lib/planner/server';
import type { PlannerPreview, PlannerTask, TaskChange } from '@/lib/planner/types';

const requestSchema = z.object({ action: z.enum(['preview','apply']), planningDate: dateOnlySchema, preferences: planningPreferencesSchema,
  version: z.string().optional(), proposal: workBreakdownSchema.optional() });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Sign in to plan assignment work.' }, { status: 401 });
  try {
    const input = requestSchema.parse(await request.json());
    if (Math.abs(Date.parse(input.planningDate) - Date.parse(new Date().toISOString().slice(0,10))) > 86400000) throw new PlannerError('Reopen the planner to use today’s date.');
    const [workspace, assignmentResult, materialsResult] = await Promise.all([
      loadPlannerWorkspace(supabase),
      supabase.from('assignments').select('id,title,extracted_text,original_file_name').eq('id',id).eq('user_id', user.id).maybeSingle(),
      supabase.from('assignment_materials').select('original_file_name,extracted_text').eq('assignment_id',id).eq('user_id',user.id).order('created_at', { ascending: false }),
    ]);
    if (assignmentResult.error || materialsResult.error) throw new PlannerError('Assignment materials could not be loaded.', 500);
    const assignment = workspace.assignments.find(a => a.id === id);
    if (!assignmentResult.data || !assignment) throw new PlannerError('Assignment not found.', 404);
    if (assignment.status === 'completed') throw new PlannerError('This assignment is already completed.', 409);
    const editable = workspace.tasks.filter(t => t.assignment_id === id && !isProtectedTask(t, workspace));
    const protectedTasks = workspace.tasks.filter(t => t.assignment_id === id && isProtectedTask(t, workspace));
    if (!editable.length && protectedTasks.length) throw new PlannerError('All existing tasks are protected. Unpin an unstarted task to restructure its work.',409);
    const sources = [...(materialsResult.data ?? []), assignmentResult.data].flatMap(s => s.extracted_text?.trim() ? [{ name: s.original_file_name ?? 'Assignment instructions', text: s.extracted_text }] : []);
    if (!sources.length) throw new PlannerError('Upload readable assignment instructions before creating concrete steps.',409);
    if (input.action === 'apply' && (!input.version || input.version !== workspace.version || !input.proposal)) throw new PlannerError('Your planner changed. Preview the task breakdown again.',409);
    const proposal = input.action === 'preview' ? await generateWorkBreakdown({ title: assignment.title, sources,
      editableTitles: editable.map(t => t.title), protectedTitles: protectedTasks.map(t => t.title), userId: user.id, signal: request.signal })
      : verifyWorkBreakdown(input.proposal!, assignment.title, sources);
    const fixed = workspace.tasks.filter(t => !editable.some(e => e.id === t.id));
    const counts = countTasks(fixed);
    const preview: PlannerPreview = { version: workspace.version, preferences: input.preferences, blocks: [], conflicts: [], existingCounts: { ...counts }, protectedCount: protectedTasks.length };
    const changes: TaskChange[] = editable.map(task => ({ before: task, after: null }));
    const deadline = assignment.due_date;
    const latest = deadline && deadline >= input.planningDate ? (deadline === input.planningDate ? deadline : addPlanningDays(deadline,-1)) : addPlanningDays(input.planningDate,13);
    const courseItems = plannerCourseItems(workspace.assignments);
    const courseItem = courseItems.find(item => item.id === id);
    const examBoundary = courseItem ? getExamBoundary(courseItem, courseItems, input.planningDate) : null;
    let nextDate = examBoundary?.earliestDate ?? input.planningDate;
    for (const [index,task] of proposal.tasks.entries()) {
      let date: string | null = null;
      for (let candidate = nextDate; candidate <= latest && candidate <= addPlanningDays(input.planningDate,730); candidate = addPlanningDays(candidate,1)) {
        if ((counts[candidate] ?? 0) < capacityOnDate(candidate,input.preferences)) { date = candidate; break; }
      }
      if (!date) { preview.conflicts.push({ title: task.title, dueDate: deadline, reason: `${examBoundary ? `${examBoundary.reason} ` : ''}No available block remains before the deadline. Adjust availability and preview again.` }); continue; }
      counts[date] = (counts[date] ?? 0) + 1;
      nextDate = addPlanningDays(date,1);
      const newTask: PlannerTask = { id: randomUUID(), user_id: user.id, assignment_id: id, class_id: assignment.class_id,
        title: task.title, description: `${task.sourceName}: ${task.sourceQuote}`, scheduled_date: date,
        priority: assignment.importance === 'critical' ? 'high' : assignment.importance, status: 'todo', source: 'context_generated',
        context_version: assignment.context_version, user_edited: false, pinned: false, checklist: task.checklist };
      changes.push({ before: null, after: newTask });
      preview.blocks.push({ id: String(index), title: task.title, scheduledDate: date, checklist: task.checklist,
        reason: examBoundary?.reason ?? (deadline && deadline < input.planningDate ? 'Recovery work for a missed deadline; the original deadline stays unchanged.' : `Based on ${task.sourceName}. Ordered around your other work before the deadline.`) });
    }
    if (input.action === 'preview') return Response.json({ ...preview, proposal, previousTaskCount: editable.length });
    if (preview.conflicts.length) throw new PlannerError('The proposed tasks do not fit. Adjust availability and preview again.',409);
    const changeId = await commitPlannerChange(supabase, { version: input.version!, kind: 'restructure', changes, preferences: input.preferences });
    return Response.json({ changeId, updatedTaskCount: proposal.tasks.length });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({ error: 'Review the task breakdown and availability.' }, { status: 400 });
    if (error instanceof PlannerError) return Response.json({ error: error.message }, { status: error.status });
    console.error('Work breakdown failed:', error);
    return Response.json({ error: 'The material could not be turned into a verified task plan. Please try again.' }, { status: 502 });
  }
}
