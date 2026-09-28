"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flame,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import type { StudySessionType } from "@/types/database";

type ProgressTask = {
  id: string;
  scheduled_date: string;
  status: string;
  title: string;
};

type ProgressSession = {
  actual_minutes: number | null;
  ended_at: string | null;
  id: string;
  session_type: StudySessionType;
  title: string | null;
};

type DayProgress = {
  completedTasks: number;
  dateKey: string;
  label: string;
  minutes: number;
  totalTasks: number;
};

const sessionLabels: Record<StudySessionType, string> = {
  assignment: "Assignment",
  flashcards: "Flashcards",
  general_study: "General study",
  practice_quiz: "Practice quiz",
};

export default function ProgressPage() {
  const [tasks, setTasks] = useState<ProgressTask[]>([]);
  const [sessions, setSessions] = useState<ProgressSession[]>([]);
  const [dateKeys, setDateKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      setIsLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) throw new Error("A signed-in user is required.");

        const keys = getRecentDateKeys(7);
        const start = startOfLocalDay(keys[0]).toISOString();
        const end = new Date(startOfLocalDay(keys.at(-1) ?? keys[0]).getTime() + 86_400_000).toISOString();

        const [taskResult, sessionResult] = await Promise.all([
          supabase
            .from("study_plan_tasks")
            .select("id, title, status, scheduled_date")
            .eq("user_id", user.id)
            .gte("scheduled_date", keys[0])
            .lte("scheduled_date", keys.at(-1) ?? keys[0])
            .order("scheduled_date", { ascending: true }),
          supabase
            .from("study_sessions")
            .select("id, title, actual_minutes, ended_at, session_type")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .gte("ended_at", start)
            .lt("ended_at", end)
            .order("ended_at", { ascending: false }),
        ]);

        if (taskResult.error) throw taskResult.error;
        if (sessionResult.error) throw sessionResult.error;
        if (cancelled) return;

        setDateKeys(keys);
        setTasks((taskResult.data ?? []) as ProgressTask[]);
        setSessions((sessionResult.data ?? []) as ProgressSession[]);
      } catch (loadError) {
        if (cancelled) return;
        console.error("Error loading progress:", loadError);
        setError("Your progress could not be loaded. Check your connection and try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProgress();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const dailyProgress = useMemo(
    () => buildDailyProgress(dateKeys, tasks, sessions),
    [dateKeys, sessions, tasks],
  );
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const totalMinutes = sessions.reduce((total, session) => total + (session.actual_minutes ?? 0), 0);
  const completionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const activeDays = dailyProgress.filter((day) => day.completedTasks > 0 || day.minutes > 0).length;
  const streak = getStreak(dailyProgress);
  const hasActivity = tasks.length > 0 || sessions.length > 0;

  return (
    <div className="page-shell">
      <div className="page-container max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-gray-950">Progress</h1>
            <p className="py-2 text-xl text-gray-600">
              A calm look at what you finished over the last seven days—without streak pressure.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefreshToken((current) => current + 1)}
            disabled={isLoading}
            className="self-start bg-white sm:self-auto"
          >
            {isLoading ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
            Refresh
          </Button>
        </header>

        {error ? (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setRefreshToken((current) => current + 1)} className="font-semibold underline underline-offset-4">Try again</button>
          </div>
        ) : null}

        <section aria-label="Progress summary" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={CheckCircle2} label="Tasks finished" value={isLoading ? "—" : String(completedTasks)} detail={tasks.length ? `${tasks.length} planned this week` : "No tasks planned yet"} tone="blue" />
          <MetricCard icon={Clock3} label="Focused time" value={isLoading ? "—" : formatMinutes(totalMinutes)} detail={`${sessions.length} completed session${sessions.length === 1 ? "" : "s"}`} tone="emerald" />
          <MetricCard icon={Target} label="Completion" value={isLoading ? "—" : `${completionRate}%`} detail={tasks.length ? "Of scheduled tasks" : "Plan tasks to begin"} tone="violet" />
          <MetricCard icon={Flame} label="Active days" value={isLoading ? "—" : `${activeDays}/7`} detail={streak ? `${streak}-day current rhythm` : "Every restart counts"} tone="amber" />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)]">
          <section aria-labelledby="weekly-activity-heading" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="weekly-activity-heading" className="text-lg font-semibold">Weekly activity</h2>
                <p className="mt-1 text-sm text-gray-500">Completed tasks and focused minutes by day.</p>
              </div>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">Last 7 days</Badge>
            </div>

            {isLoading ? (
              <div className="mt-8 flex h-56 items-end gap-3" aria-label="Loading weekly activity">
                {[42, 68, 35, 82, 55, 76, 48].map((height, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center gap-3">
                    <div className="w-full animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" style={{ height: `${height}%` }} />
                    <div className="h-3 w-8 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            ) : hasActivity ? (
              <WeeklyChart days={dailyProgress} />
            ) : (
              <EmptyProgress />
            )}
          </section>

          <section aria-labelledby="recent-sessions-heading" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 id="recent-sessions-heading" className="text-lg font-semibold">Recent focus</h2>
            <p className="mt-1 text-sm text-gray-500">Your latest completed sessions.</p>

            <div className="mt-5">
              {isLoading ? (
                <div className="space-y-3" aria-label="Loading recent focus sessions">
                  {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" />)}
                </div>
              ) : sessions.length ? (
                <ul className="divide-y divide-gray-100">
                  {sessions.slice(0, 5).map((session) => (
                    <li key={session.id} className="py-3 first:pt-0">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          <Sparkles className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{session.title || sessionLabels[session.session_type]}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{formatSessionDate(session.ended_at)} · {formatMinutes(session.actual_minutes ?? 0)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                  <CalendarCheck2 className="mx-auto size-6 text-gray-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-gray-900">No completed sessions yet</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">Finish a guided session and it will appear here.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: typeof CheckCircle2;
  label: string;
  tone: "amber" | "blue" | "emerald" | "violet";
  value: string;
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex size-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-gray-600">{label}</p>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight text-gray-950">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

function WeeklyChart({ days }: { days: DayProgress[] }) {
  const maxScore = Math.max(...days.map((day) => day.minutes + day.completedTasks * 15), 1);

  return (
    <div className="mt-8">
      <div className="flex h-56 items-end gap-2 sm:gap-4">
        {days.map((day) => {
          const score = day.minutes + day.completedTasks * 15;
          const height = score ? Math.max(12, Math.round((score / maxScore) * 100)) : 3;
          const fullLabel = `${day.label}: ${day.completedTasks} completed task${day.completedTasks === 1 ? "" : "s"}, ${day.minutes} focused minute${day.minutes === 1 ? "" : "s"}`;

          return (
            <div key={day.dateKey} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" aria-label={fullLabel}>
              <div className="flex min-h-0 w-full flex-1 items-end rounded-xl bg-gray-100 p-1.5">
                <div
                  className={`w-full rounded-lg ${score ? "bg-linear-to-t from-purple-500 to-blue-500" : "bg-gray-200"}`}
                  style={{ height: `${height}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-[11px] font-medium text-gray-500 sm:text-xs">{day.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
        <span><strong className="font-semibold text-gray-800">{days.reduce((sum, day) => sum + day.completedTasks, 0)}</strong> tasks completed</span>
        <span><strong className="font-semibold text-gray-800">{formatMinutes(days.reduce((sum, day) => sum + day.minutes, 0))}</strong> focused</span>
      </div>
    </div>
  );
}

function EmptyProgress() {
  return (
    <div className="mt-7 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 text-center">
      <Target className="size-7 text-gray-400" aria-hidden="true" />
      <h3 className="mt-4 font-semibold text-gray-950">Your week starts with one small step</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">Add a task or finish a focus session. Your progress will build here automatically.</p>
      <Button asChild size="sm" className="mt-5">
        <Link href="/planner">Plan a task <ArrowRight aria-hidden="true" /></Link>
      </Button>
    </div>
  );
}

function buildDailyProgress(dateKeys: string[], tasks: ProgressTask[], sessions: ProgressSession[]) {
  return dateKeys.map((dateKey) => {
    const dayTasks = tasks.filter((task) => task.scheduled_date === dateKey);
    const daySessions = sessions.filter((session) => session.ended_at && toLocalDateKey(new Date(session.ended_at)) === dateKey);
    const date = startOfLocalDay(dateKey);

    return {
      completedTasks: dayTasks.filter((task) => task.status === "completed").length,
      dateKey,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      minutes: daySessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0),
      totalTasks: dayTasks.length,
    } satisfies DayProgress;
  });
}

function getRecentDateKeys(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - index));
    return toLocalDateKey(date);
  });
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getStreak(days: DayProgress[]) {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];
    if (day.completedTasks === 0 && day.minutes === 0) break;
    streak += 1;
  }
  return streak;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatSessionDate(value: string | null) {
  if (!value) return "Recently";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
