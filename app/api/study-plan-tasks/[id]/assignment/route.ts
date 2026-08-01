import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be logged in to upload an assignment file." },
      { status: 401 },
    );
  }

  const { data: task, error: taskError } = await supabase
    .from("study_plan_tasks")
    .select("id, assignment_id, class_id, title, priority")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (taskError) {
    return NextResponse.json(
      { error: "The task could not be loaded." },
      { status: 500 },
    );
  }

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  if (task.assignment_id) {
    return NextResponse.json({ assignmentId: task.assignment_id });
  }

  const importance = ["low", "medium", "high", "critical"].includes(
    task.priority,
  )
    ? task.priority
    : "medium";
  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .insert({
      user_id: user.id,
      class_id: task.class_id,
      title: task.title,
      importance,
      status: "not_started",
    })
    .select("id")
    .single();

  if (assignmentError || !assignment) {
    return NextResponse.json(
      { error: "An assignment could not be created for this task." },
      { status: 500 },
    );
  }

  const { error: linkError } = await supabase
    .from("study_plan_tasks")
    .update({ assignment_id: assignment.id })
    .eq("id", task.id)
    .eq("user_id", user.id);

  if (linkError) {
    await supabase
      .from("assignments")
      .delete()
      .eq("id", assignment.id)
      .eq("user_id", user.id);
    return NextResponse.json(
      { error: "The new assignment could not be linked to this task." },
      { status: 500 },
    );
  }

  return NextResponse.json({ assignmentId: assignment.id }, { status: 201 });
}
