import { notFound, redirect } from "next/navigation";

import {
  TaskDetailsView,
  type TaskDetailsData,
} from "@/components/tasks/TaskDetailsView";
import { createClient } from "@/lib/supabase/server";

type TaskDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

const taskReturnDestinations = {
  calendar: { href: "/calendar", label: "calendar" },
  dashboard: { href: "/dashboard", label: "dashboard" },
  planner: { href: "/planner", label: "planner" },
} as const;

type TaskAssignment = {
  id: string;
  title: string;
  due_date: string | null;
  original_file_name: string | null;
  extracted_text: string | null;
};

type TaskClass = {
  name: string;
  color: string | null;
};

export default async function TaskDetailsPage({
  params,
  searchParams,
}: TaskDetailsPageProps) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const returnDestination = getTaskReturnDestination(from);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: task, error } = await supabase
    .from("study_plan_tasks")
    .select(`
      id,
      class_id,
      assignment_id,
      title,
      priority,
      status,
      scheduled_date,
      classes (name, color),
      assignments (
        id,
        title,
        due_date,
        original_file_name,
        extracted_text
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error("The task details could not be loaded.");
  if (!task) notFound();

  const assignment = getSingleRelation(task.assignments) as TaskAssignment | null;
  const taskClass = getSingleRelation(task.classes) as TaskClass | null;
  const taskDetails: TaskDetailsData = {
    id: task.id,
    classId: task.class_id,
    assignmentId: task.assignment_id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    scheduledDate: task.scheduled_date,
    taskClass,
    assignment: assignment
      ? {
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.due_date,
          originalFileName: assignment.original_file_name,
          extractedText: assignment.extracted_text,
        }
      : null,
  };

  return (
    <TaskDetailsView
      task={taskDetails}
      returnHref={returnDestination.href}
      returnLabel={returnDestination.label}
    />
  );
}

function getTaskReturnDestination(from: string | string[] | undefined) {
  const origin = Array.isArray(from) ? from[0] : from;

  if (origin && origin in taskReturnDestinations) {
    return taskReturnDestinations[
      origin as keyof typeof taskReturnDestinations
    ];
  }

  return taskReturnDestinations.planner;
}

function getSingleRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}
