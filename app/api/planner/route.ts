import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { dateOnlySchema, planningPreferencesSchema } from '@/lib/planner/preferences';
import { previewCatchUp } from '@/lib/planner/catchUp';
import { commitPlannerChange, loadPlannerWorkspace, PlannerError } from '@/lib/planner/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Sign in to load your planner.' }, { status: 401 });
  try {
    const workspace = await loadPlannerWorkspace(supabase);
    return Response.json({ preferences: workspace.preferences, lastChangeId: workspace.lastChangeId });
  } catch { return Response.json({ error: 'Your availability could not be loaded.' }, { status: 500 }); }
}
const requestSchema = z.object({
  action: z.enum(['preview','apply','undo']), planningDate: dateOnlySchema,
  preferences: planningPreferencesSchema, version: z.string().optional(), undoId: z.string().uuid().optional(),
});
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Sign in to update your planner.' }, { status: 401 });
  try {
    const input = requestSchema.parse(await request.json());
    if (Math.abs(Date.parse(input.planningDate) - Date.parse(new Date().toISOString().slice(0,10))) > 86400000) throw new PlannerError('Reopen the planner to use today’s date.');
    const workspace = await loadPlannerWorkspace(supabase);
    if (input.action === 'undo') {
      if (!input.undoId) throw new PlannerError('Choose a change to undo.');
      const changeId = await commitPlannerChange(supabase, { version: workspace.version, kind: 'undo', changes: [], preferences: workspace.preferences, undoId: input.undoId });
      return Response.json({ changeId });
    }
    const preview = previewCatchUp(workspace, input.planningDate, input.preferences);
    if (input.action === 'preview') return Response.json(preview);
    if (!input.version || input.version !== workspace.version) throw new PlannerError('Your planner changed. Preview again.', 409);
    if (preview.conflicts.length) throw new PlannerError('Resolve the scheduling conflicts before applying this plan.', 409);
    const changeId = await commitPlannerChange(supabase, { version: input.version, kind: 'catch_up', changes: preview.changes ?? [], preferences: input.preferences });
    return Response.json({ changeId, updatedTaskCount: preview.changes?.length ?? 0 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({ error: 'Choose valid availability settings.' }, { status: 400 });
    if (error instanceof PlannerError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'The plan could not be updated.' }, { status: 500 });
  }
}
