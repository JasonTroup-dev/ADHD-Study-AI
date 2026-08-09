import { redirect } from "next/navigation";

import DashboardClient from "@/app/(app)/dashboard/DashboardClient";
import {
  normalizeStudyTasks,
  normalizeUpcomingAssignments,
  type DashboardInitialData,
} from "@/app/(app)/dashboard/dashboardData";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Error loading dashboard user:", userError);
  }

  if (!user) redirect("/login");

  const currentDate = new Date();
  const dateString = formatQueryDate(currentDate);
  const nextWeekDateString = formatQueryDate(
    new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 7,
    ),
  );
  const { start, end } = getLocalDayRange(currentDate);

  const [
    classesResult,
    tasksResult,
    activeSessionResult,
    assignmentsResult,
    completedSessionsResult,
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("study_plan_tasks")
      .select(`
        id,
        class_id,
        assignment_id,
        title,
        priority,
        status,
        scheduled_date,
        classes (
          name,
          color
        )
      `)
      .eq("user_id", user.id)
      .eq("scheduled_date", dateString)
      .order("created_at", { ascending: true }),
    supabase
      .from("study_sessions")
      .select("id, title, session_type, started_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select(`
        id,
        title,
        due_date,
        importance,
        points,
        classes (
          name
        )
      `)
      .eq("user_id", user.id)
      .neq("status", "completed")
      .gte("due_date", dateString)
      .lte("due_date", nextWeekDateString)
      .order("due_date", { ascending: true }),
    supabase
      .from("study_sessions")
      .select("actual_minutes")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("ended_at", start)
      .lt("ended_at", end)
      .order("ended_at", { ascending: false }),
  ]);

  logQueryError("classes", classesResult.error);
  logQueryError("tasks", tasksResult.error);
  logQueryError("active study session", activeSessionResult.error);
  logQueryError("upcoming assignments", assignmentsResult.error);
  logQueryError("today's study sessions", completedSessionsResult.error);

  const completedSessions = completedSessionsResult.data ?? [];
  const initialData: DashboardInitialData = {
    userId: user.id,
    dateString,
    formattedDate: currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    classes: classesResult.data ?? [],
    tasks: normalizeStudyTasks(tasksResult.data ?? []),
    activeStudySession: activeSessionResult.data,
    upcomingAssignments: normalizeUpcomingAssignments(
      assignmentsResult.data ?? [],
    ),
    todayStudyMinutes: completedSessions.reduce(
      (total, session) => total + (session.actual_minutes ?? 0),
      0,
    ),
    todayStudySessionCount: completedSessions.length,
    studyError: completedSessionsResult.error
      ? "Could not load today's study progress."
      : null,
  };

  return <DashboardClient initialData={initialData} />;
}

function formatQueryDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocalDayRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  );

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function logQueryError(label: string, error: { message: string } | null) {
  if (error) console.error(`Error loading dashboard ${label}:`, error);
}
