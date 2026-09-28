import { notFound, redirect } from "next/navigation";

import {
  AssignmentDetailsView,
  type AssignmentDetailsData,
} from "@/components/assignments/AssignmentDetailsView";
import { createClient } from "@/lib/supabase/server";

type AssignmentDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

type AssignmentClass = {
  name: string;
  color: string | null;
};

export default async function AssignmentDetailsPage({
  params,
  searchParams,
}: AssignmentDetailsPageProps) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [assignmentResult, tasksResult, materialsResult] = await Promise.all([
    supabase
      .from("assignments")
      .select(`
        id,
        class_id,
        title,
        description,
        due_date,
        deadline_evidence,
        importance,
        points,
        status,
        original_file_name,
        classes (name, color)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("study_plan_tasks")
      .select("id, title, priority, status, scheduled_date")
      .eq("assignment_id", id)
      .eq("user_id", user.id)
      .order("scheduled_date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("assignment_materials")
      .select("id, original_file_name, file_type, extracted_text")
      .eq("assignment_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (assignmentResult.error) {
    throw new Error("The assignment details could not be loaded.");
  }
  if (tasksResult.error) {
    throw new Error("The assignment tasks could not be loaded.");
  }
  if (materialsResult.error) {
    throw new Error("The assignment materials could not be loaded.");
  }
  if (!assignmentResult.data) notFound();

  const assignment = assignmentResult.data;
  const assignmentClass = getSingleRelation(
    assignment.classes,
  ) as AssignmentClass | null;
  const details: AssignmentDetailsData = {
    id: assignment.id,
    classId: assignment.class_id,
    title: assignment.title,
    description: assignment.description,
    dueDate: assignment.due_date,
    deadlineEvidence: assignment.deadline_evidence,
    importance: assignment.importance,
    points: assignment.points,
    status: assignment.status,
    originalFileName: assignment.original_file_name,
    assignmentClass,
    materials: (materialsResult.data ?? []).map((material) => ({
      id: material.id,
      originalFileName: material.original_file_name,
      fileType: material.file_type,
      hasExtractedText: Boolean(material.extracted_text),
    })),
    tasks: (tasksResult.data ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      scheduledDate: task.scheduled_date,
    })),
  };
  const returnDestination = getReturnDestination(
    from,
    assignment.class_id,
  );

  return (
    <AssignmentDetailsView
      assignment={details}
      returnHref={returnDestination.href}
      returnLabel={returnDestination.label}
    />
  );
}

function getReturnDestination(
  from: string | string[] | undefined,
  classId: string | null,
) {
  const origin = Array.isArray(from) ? from[0] : from;

  if (origin === "calendar") return { href: "/calendar", label: "calendar" };
  if (origin === "class" && classId) {
    return { href: `/classes/${classId}`, label: "class" };
  }

  return { href: "/planner/assignments", label: "assignments" };
}

function getSingleRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}
