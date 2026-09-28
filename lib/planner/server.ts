import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import type { PlannerWorkspace, TaskChange } from './types';
import type { PlanningPreferences } from './preferences';

export class PlannerError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type PlannerClient = Awaited<ReturnType<typeof createClient>>;
export async function loadPlannerWorkspace(supabase: PlannerClient): Promise<PlannerWorkspace> {
  const { data, error } = await supabase.rpc('planner_workspace');
  if (error || !data) throw new PlannerError('The planner could not be loaded. Please try again.', 500);
  return data as unknown as PlannerWorkspace;
}
export async function commitPlannerChange(supabase: PlannerClient, input: {
  version: string; kind: 'import' | 'catch_up' | 'restructure' | 'undo'; changes: TaskChange[];
  preferences: PlanningPreferences; assignments?: unknown[]; newClass?: unknown; undoId?: string;
}) {
  const { data, error } = await supabase.rpc('commit_planner_change', {
    p_version: input.version, p_kind: input.kind, p_changes: input.changes as unknown as Json,
    p_preferences: input.preferences as unknown as Json, p_assignments: (input.assignments ?? []) as Json,
    p_class: (input.newClass ?? null) as Json, p_undo_id: input.undoId ?? null,
  });
  if (error) throw new PlannerError(error.code === '40001' ? error.message : 'The plan could not be saved. No changes were kept.', error.code === '40001' ? 409 : 500);
  return data;
}
