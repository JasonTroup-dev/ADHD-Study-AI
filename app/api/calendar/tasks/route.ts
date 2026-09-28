import { createClient } from "@/lib/supabase/server";
import {
  createCalendarTaskSchema,
  rescheduleCalendarTaskSchema,
} from "@/lib/calendar/taskInput";

export async function POST(request: Request) {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    return Response.json({ error: "Sign in to add tasks." }, { status: 401 });
  const parsed = createCalendarTaskSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      {
        error:
          "Enter a title, valid date, and a positive estimate if provided.",
      },
      { status: 400 },
    );
  const input = parsed.data;
  if (input.classId) {
    const result = await db
      .from("classes")
      .select("id")
      .eq("id", input.classId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (result.error)
      return Response.json(
        { error: "The class could not be checked. Try again." },
        { status: 500 },
      );
    if (!result.data)
      return Response.json({ error: "Class not found." }, { status: 404 });
  }
  const result = await db
    .from("study_plan_tasks")
    .insert({
      title: input.title,
      scheduled_date: input.date,
      class_id: input.classId,
      estimated_minutes: input.estimatedMinutes,
      user_id: user.id,
      status: "todo",
      source: "manual",
      priority: "medium",
      user_edited: true,
    })
    .select("id")
    .single();
  if (result.error)
    return Response.json(
      { error: "The task could not be saved. Try again." },
      { status: 500 },
    );
  return Response.json({ id: result.data.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    return Response.json(
      { error: "Sign in to reschedule tasks." },
      { status: 401 },
    );
  const parsed = rescheduleCalendarTaskSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "Choose a valid task and date." },
      { status: 400 },
    );
  const input = parsed.data;
  // Compare the original date so a stale calendar cannot overwrite a newer plan.
  const result = await db
    .from("study_plan_tasks")
    .update({ scheduled_date: input.date, user_edited: true })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .eq("scheduled_date", input.previousDate)
    .neq("status", "completed")
    .select("id")
    .maybeSingle();
  if (result.error)
    return Response.json(
      { error: "The task could not be moved. Try again." },
      { status: 500 },
    );
  if (!result.data)
    return Response.json(
      {
        error:
          "This task changed or is no longer available. Refresh the calendar before trying again.",
      },
      { status: 409 },
    );
  return Response.json({ id: result.data.id, date: input.date });
}
