import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Sign in to update tasks.' }, { status: 401 });
  try {
    const body = z.union([
      z.object({ pinned: z.boolean() }).strict(),
      z.object({ estimatedMinutes: z.number().int().min(1).max(1440).nullable() }).strict(),
    ]).parse(await request.json());
    const update = 'pinned' in body ? { pinned: body.pinned } : { estimated_minutes: body.estimatedMinutes };
    const result = await supabase.from('study_plan_tasks').update(update).eq('id',id).eq('user_id',user.id).select('id').maybeSingle();
    if (result.error) return Response.json({ error: 'The task could not be updated.' }, { status: 500 });
    if (!result.data) return Response.json({ error: 'Task not found.' }, { status: 404 });
    return Response.json(body);
  } catch { return Response.json({ error: 'Choose a valid pin setting or time estimate.' }, { status: 400 }); }
}
