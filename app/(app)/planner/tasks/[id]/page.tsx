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
      pinned,
      checklist,
      description,
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
  const { data: supportingMaterials, error: materialsError } = assignment
    ? await supabase
        .from("assignment_materials")
        .select("original_file_name, extracted_text")
        .eq("assignment_id", assignment.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (materialsError) {
    throw new Error("The assignment materials could not be loaded.");
  }
  const studySessionId = task.status === "completed"
    ? await findCompletedStudySessionId(supabase, user.id, {
        id: task.id,
        assignmentId: task.assignment_id,
        classId: task.class_id,
        title: task.title,
      })
    : null;
  const taskClass = getSingleRelation(task.classes) as TaskClass | null;
  const returnDestination = getTaskReturnDestination(from, task.assignment_id);
  const taskDetails: TaskDetailsData = {
    id: task.id,
    classId: task.class_id,
    assignmentId: task.assignment_id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    scheduledDate: task.scheduled_date,
    pinned: task.pinned,
    checklist: Array.isArray(task.checklist) ? task.checklist.filter((item): item is string => typeof item === 'string') : [],
    sourceEvidence: task.description,
    studySessionId,
    taskClass,
    assignment: assignment
      ? {
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.due_date,
          originalFileName: assignment.original_file_name,
          extractedText: assignment.extracted_text,
          supportingMaterials: (supportingMaterials ?? []).map((material) => ({
            name: material.original_file_name,
            text: material.extracted_text,
          })),
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

async function findCompletedStudySessionId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  task: {
    id: string;
    assignmentId: string | null;
    classId: string | null;
    title: string;
  },
) {
  const { data: linkedSession, error: linkedSessionError } = await supabase
    .from("study_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("planner_task_id", task.id)
    .eq("status", "completed")
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (linkedSessionError) {
    throw new Error("The completed study session could not be loaded.");
  }
  if (linkedSession) return linkedSession.id;

  // Sessions created before planner_task_id was added can still be recovered
  // from the immutable completed task title and its assignment/class context.
  let historicalQuery = supabase
    .from("study_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("title", task.title)
    .eq("status", "completed")
    .is("planner_task_id", null)
    .order("ended_at", { ascending: false })
    .limit(1);

  historicalQuery = task.assignmentId
    ? historicalQuery.eq("assignment_id", task.assignmentId)
    : historicalQuery.is("assignment_id", null);
  historicalQuery = task.classId
    ? historicalQuery.eq("class_id", task.classId)
    : historicalQuery.is("class_id", null);

  const { data: historicalSession, error: historicalSessionError } =
    await historicalQuery.maybeSingle();

  if (historicalSessionError) {
    throw new Error("The completed study session could not be loaded.");
  }

  return historicalSession?.id ?? null;
}

function getTaskReturnDestination(
  from: string | string[] | undefined,
  assignmentId: string | null,
) {
  const origin = Array.isArray(from) ? from[0] : from;

  if (origin === "assignment" && assignmentId) {
    return {
      href: `/planner/assignments/${assignmentId}`,
      label: "assignment",
    };
  }

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
