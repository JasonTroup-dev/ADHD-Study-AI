"use client"

import { Button } from "@/components/ui/button";
import { TaskCard, type StudyTask, } from "@/components/ui/taskCard";
import { BookOpen, Brain, CalendarCheck2, CalendarDays, Clock3, FileText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import {
  getActiveStudySession,
  getSessionTypeLabel,
  getTodayCompletedStudySessions,
  getTodayTotalStudyMinutes,
} from "@/lib/studySessions";
import type { AssignmentImportance } from "@/types/assignments";
import type { StudySession, StudySessionType } from "@/types/database";
import StudyPlannerModal from "@/components/StudyPlanner/StudyPlannerModal";
import type { StudyPlanImportSummary } from "@/types/syllabus";
import { CompletionProgress } from "@/components/ui/completionProgress";

type ClassOption = {
  id: string;
  name: string;
};

type UpcomingAssignment = {
  id: string;
  title: string;
  due_date: string;
  importance: AssignmentImportance;
  points: number | null;
  classes: { name: string }[] | null;
};


export default function DashboardPage() {

  const [userId, setUserId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [activeStudySession, setActiveStudySession] =
    useState<StudySession | null>(null);
  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const [upcomingAssignments, setUpcomingAssignments] = useState<
    UpcomingAssignment[]
  >([]);
  const [todayStudyMinutes, setTodayStudyMinutes] = useState(0);
  const [todayStudySessionCount, setTodayStudySessionCount] = useState(0);
  const [todayAssignmentStudySessionCount, setTodayAssignmentStudySessionCount] =
    useState(0);
  const [mostRecentSessionType, setMostRecentSessionType] =
    useState<StudySessionType | null>(null);
  const [isStudyLoading, setIsStudyLoading] = useState(true);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [studyPlanNotice, setStudyPlanNotice] = useState<string | null>(null);
  const [studyPlanRefreshToken, setStudyPlanRefreshToken] = useState(0);
  const [currentDate] = useState(new Date());
 
  const formattedDate = currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });

  function formatQueryDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const dateString = formatQueryDate(currentDate);
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const totalTasks = tasks.length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  function formatDeadlineDate(date: string) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  useEffect(() => {
      async function loadUser() {
          const {
              data: { user },
          } = await supabase.auth.getUser();

          if (!user) return;

          setUserId(user.id);
      }

      loadUser();
  }, []);

  useEffect(() => {
    async function loadClasses() {
      if (!userId) return;

      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading classes:", error);
        return;
      }

      setClasses(data ?? []);
    }

    loadClasses();
  }, [userId]);

  useEffect(() => {
    async function loadTasks() {
        if (!userId) return;

        setIsTasksLoading(true);

        const [tasksResult, activeSession] = await Promise.all([
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
            .eq("user_id", userId)
            .eq("scheduled_date", dateString)
            .order("created_at", { ascending: true }),
          getActiveStudySession().catch((error: unknown) => {
            console.error("Error loading active study session:", error);
            return null;
          }),
        ]);

        if (tasksResult.error) {
          console.error("Error loading tasks:", tasksResult.error);
          setIsTasksLoading(false);
          return;
        }

        setTasks(tasksResult.data ?? []);
        setActiveStudySession(activeSession);
        setIsTasksLoading(false);
      }

    loadTasks();
  }, [userId, dateString, studyPlanRefreshToken]);

  useEffect(() => {
    async function loadUpcomingAssignments() {
        if (!userId) return;

        const [year, month, day] = dateString.split("-").map(Number);
        const nextWeekDate = new Date(year, month - 1, day);
        nextWeekDate.setDate(day + 7);
        const nextWeekDateString = formatQueryDate(nextWeekDate);

        const { data, error } = await supabase
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
        .eq("user_id", userId)
        .neq("status", "completed")
        .gte("due_date", dateString)
        .lte("due_date", nextWeekDateString)
        .order("due_date", { ascending: true });

        if (error) {
          console.error("Error loading upcoming assignments:", error);
          return;
        }

        setUpcomingAssignments(data ?? []);
      }

    loadUpcomingAssignments();
  }, [userId, dateString, studyPlanRefreshToken]);

  useEffect(() => {
    async function loadTodayStudy() {
      if (!userId) return;

      setIsStudyLoading(true);
      setStudyError(null);

      try {
        const sessions = await getTodayCompletedStudySessions();
        const totalMinutes = await getTodayTotalStudyMinutes(sessions);

        setTodayStudySessionCount(sessions.length);
        setTodayAssignmentStudySessionCount(
          sessions.filter((session) => session.session_type === "assignment")
            .length,
        );
        setTodayStudyMinutes(totalMinutes);
        setMostRecentSessionType(sessions[0]?.session_type ?? null);
      } catch (error) {
        console.error("Error loading today's study sessions:", error);
        setStudyError("Could not load today's study progress.");
      } finally {
        setIsStudyLoading(false);
      }
    }

    loadTodayStudy();
  }, [userId]);

  async function handleToggleTask(task: StudyTask) {
    const newStatus = task.status === "completed" ? "todo" : "completed";

    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id
          ? { ...currentTask, status: newStatus }
          : currentTask
      )
    );

    const { error } = await supabase
      .from("study_plan_tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    if (error) {
      console.error("Error updating task:", error);
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id
            ? { ...currentTask, status: task.status }
            : currentTask
        )
      );
      return;
    }
  }

  function handleCreateStudyPlan(summary: StudyPlanImportSummary) {
    setStudyPlanRefreshToken((currentToken) => currentToken + 1);

    if (summary.classCreated) {
      setClasses((currentClasses) =>
        currentClasses.some((classItem) => classItem.id === summary.classId)
          ? currentClasses
          : [
              ...currentClasses,
              { id: summary.classId, name: summary.className },
            ],
      );
    }

    setStudyPlanNotice(
      `${summary.classCreated ? `${summary.className} was created. ` : ""}Study plan created with ${summary.assignmentCount} assignment${summary.assignmentCount === 1 ? "" : "s"} and ${summary.studySessionCount} study block${summary.studySessionCount === 1 ? "" : "s"}.`,
    );
  }

  return (
    <div className="min-h-full w-full bg-gray-100">
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-8 lg:px-8">
        <div>
          <h1 className="text-4xl font-medium">Dashboard</h1>
          <p className="text-xl text-gray-600 py-2">Stay on track with your study plan</p>
        </div>

        <StudyPlannerModal
          isOpen={isGenerateModalOpen}
          classes={classes}
          onClose={() => setIsGenerateModalOpen(false)}
          onStudyPlanCreated={handleCreateStudyPlan}
        />

        {studyPlanNotice ? (
          <div
            className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            role="status"
          >
            <span>{studyPlanNotice}</span>
            <button
              type="button"
              className="font-semibold text-emerald-900 hover:text-emerald-700"
              onClick={() => setStudyPlanNotice(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}


        {/* Grid Area */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">

          <div className="space-y-6 lg:col-span-8">
            { /* Main Card Div */}
            <div className="rounded-2xl bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <header className="text-xl font-semibold">{formattedDate}</header>
                  <p className="text-gray-600">{totalTasks} tasks scheduled</p>
                </div>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
              

              {/* Progress Bar */}
              <div className="my-8">
                <div className="flex items-start justify-between">
                  <p>{completedTasks} of {totalTasks} completed</p>
                  <p>{progressPercent}%</p>
                </div>

                <CompletionProgress
                  value={progressPercent}
                  label={`${completedTasks} of ${totalTasks} tasks completed`}
                  className="mt-2"
                />
              </div>


              {/* Task Area */}
              <div className="flex flex-col h-[40vh]">
                <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                  {isTasksLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      Loading today&apos;s tasks...
                    </div>
                  ) : tasks.length > 0 ? (
                    tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        activeStudySession={activeStudySession}
                        onToggle={handleToggleTask}
                      />
                    ))
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <CalendarCheck2 className="h-7 w-7" aria-hidden="true" />
                      </div>
                      <h2 className="mt-4 text-lg font-semibold text-gray-950">
                        Your day is clear
                      </h2>
                      <p className="mt-1 max-w-sm text-sm leading-6 text-gray-500">
                        Nothing is scheduled for today. Enjoy the breathing room or review some flashcards if you&apos;d like.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <header className="ml-2 text-sm font-semibold text-gray-950">Quick Actions</header>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="flex h-20 flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold transition hover:bg-gray-50"
                >
                  <Sparkles className="h-4 w-4 text-gray-700" />
                  Generate Study Plan
                </button>

                <button
                  type="button"
                  className="flex h-20 flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold transition hover:bg-gray-50"
                >
                  <Brain className="h-4 w-4 text-gray-700" />
                  Summarize Notes
                </button>

                
                <Link 
                  href="/study/flashcards/create?mode=ai"
                  className="flex h-20 flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold transition hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4 text-gray-700" />
                  Create Flashcards
                </Link>
                
              </div>
            </div>
          </div>

          {/* Secondary Card Div */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-blue-200 bg-linear-to-br from-blue-50 to-indigo-100 p-6">
              <div className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-blue-700" />
                <header className="text-xl font-semibold">Today&apos;s Study</header>
              </div>

              {isStudyLoading ? (
                <p className="mt-6 text-sm text-gray-600">Loading study progress...</p>
              ) : studyError ? (
                <p className="mt-6 text-sm text-red-700">{studyError}</p>
              ) : (
                <div className="mt-6 space-y-2">
                  <p className="text-3xl font-semibold text-gray-950">
                    {todayStudyMinutes} minutes studied
                  </p>
                  <p className="text-gray-600">
                    {todayStudySessionCount}{" "}
                    {todayStudySessionCount === 1 ? "session" : "sessions"} completed
                  </p>
                  <p className="text-sm text-gray-600">
                    {todayAssignmentStudySessionCount} assignment{" "}
                    {todayAssignmentStudySessionCount === 1 ? "session" : "sessions"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Most recent:{" "}
                    <span className="font-medium text-gray-900">
                      {mostRecentSessionType
                        ? getSessionTypeLabel(mostRecentSessionType)
                        : "No sessions yet"}
                    </span>
                  </p>
                  {todayStudySessionCount > 0 ? (
                    <p className="pt-2 text-sm font-medium text-blue-800">
                      You got started. That counts.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
              <header className="text-xl font-semibold">Upcoming Deadlines</header>

              <div className="mt-6 max-h-72 space-y-4 overflow-y-auto pr-2">
                {upcomingAssignments.map((assignment) => {
                  const assignmentClass = assignment.classes?.[0] ?? null;

                  return (
                    <div key={assignment.id}>
                      <h3 className="text-base font-semibold text-gray-950">
                        {assignment.title}
                      </h3>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Due {formatDeadlineDate(assignment.due_date)}
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {assignmentClass?.name ?? "No class"}
                          </span>
                        </span>
                        <span className="capitalize">
                          {assignment.importance} priority
                        </span>
                        {assignment.points !== null ? (
                          <span>{assignment.points} pts</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {upcomingAssignments.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No assignments due in the next week
                  </p>
                )}
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}
