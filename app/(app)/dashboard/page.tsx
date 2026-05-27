"use client"

import { Button } from "@/components/ui/button";
import {
  getTaskClassName,
  TaskCard,
  type StudyTask,
} from "@/components/ui/taskCard";
import { Brain, CalendarDays, FileText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";


export default function DashboardPage() {

  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<StudyTask[]>([]);
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
    async function loadTasks() {
        if (!userId) return;

        const { data, error } = await supabase
        .from("study_plan_tasks")
        .select(`
            id,
            title,
            estimated_minutes,
            priority,
            status,
            scheduled_date,
            classes (
            name
            )
        `)
        .eq("user_id", userId)
        .eq("scheduled_date", dateString)
        .order("created_at", { ascending: true });

        if (error) {
          console.error("Error loading tasks:", error);
          return;
        }

        setTasks(data ?? []);
      }

    loadTasks();
  }, [userId, dateString]);

  useEffect(() => {
    async function loadUpcomingDeadlines() {
        if (!userId) return;

        const [year, month, day] = dateString.split("-").map(Number);
        const nextWeekDate = new Date(year, month - 1, day);
        nextWeekDate.setDate(day + 7);
        const nextWeekDateString = formatQueryDate(nextWeekDate);

        const { data, error } = await supabase
        .from("study_plan_tasks")
        .select(`
            id,
            title,
            estimated_minutes,
            priority,
            status,
            scheduled_date,
            classes (
            name
            )
        `)
        .eq("user_id", userId)
        .gt("scheduled_date", dateString)
        .lte("scheduled_date", nextWeekDateString)
        .order("scheduled_date", { ascending: true })
        .limit(4);

        if (error) {
          console.error("Error loading upcoming deadlines:", error);
          return;
        }

        setUpcomingDeadlines(data ?? []);
      }

    loadUpcomingDeadlines();
  }, [userId, dateString]);

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

  return (
    <div className="min-h-full w-full bg-gray-100">
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-8 lg:px-8">
        <div>
          <h1 className="text-4xl font-medium">Dashboard</h1>
          <p className="text-xl text-gray-600 py-2">Stay on track with your study plan</p>
        </div>


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

                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-300">
                  <div 
                    className="h-full rounded-full bg-black"
                    style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>


              {/* Task Area */}
              <div className="flex flex-col h-[40vh]">
                <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={handleToggleTask}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <header className="ml-2 text-sm font-semibold text-gray-950">Quick Actions</header>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
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

                <button
                  type="button"
                  className="flex h-20 flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold transition hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4 text-gray-700" />
                  Create Flashcards
                </button>
              </div>
            </div>
          </div>


          {/* Secondary Card Div */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <header className="text-xl font-semibold">Upcoming Deadlines</header>

              <div className="mt-6 max-h-72 space-y-4 overflow-y-auto pr-2">
                {upcomingDeadlines.map((task) => (
                  <div key={task.id}>
                    <h3 className="text-base font-semibold text-gray-950">
                      {task.title}
                    </h3>

                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{formatDeadlineDate(task.scheduled_date)}</span>
                      <span className="text-gray-300">-</span>
                      <span>{getTaskClassName(task)}</span>
                    </div>
                  </div>
                ))}

                {upcomingDeadlines.length === 0 && (
                  <p className="text-sm text-gray-500">No upcoming deadlines</p>
                )}
              </div>
            </div>


            <div className="rounded-2xl mt-6 border border-gray-200 bg-white p-6">
              <header className="text-xl font-semibold">This Week</header>
              <div className="mt-6">
                <div className="flex justify-between">
                  <p>Tasks Complete</p>
                  <p className="text-lg font-semibold">12</p>
                </div>
                <div className="flex justify-between">
                  <p>Study Streak</p>
                  <p className="text-lg font-semibold">7 days</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}