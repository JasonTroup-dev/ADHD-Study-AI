"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Sprout,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { confirmedStudyMinutes, formatStudyMinutes as formatMinutes } from "@/lib/studyTime";
import { progressDateRange, studyActivityByDay } from "@/lib/progress";
import { SessionTimeEditor } from "@/components/study-sessions/SessionTimeEditor";
import type { StudySessionType } from "@/types/database";

type ProgressTask = {
  id: string;
  scheduled_date: string;
  status: string;
  title: string;
};

type ProgressSession = {
  time_confirmed_at: string | null;
  actual_minutes: number | null;
  ended_at: string | null;
  id: string;
  session_type: StudySessionType;
  title: string | null;
};

type DayProgress = {
  sessions: number;
  dateKey: string;
  label: string;
  minutes: number;
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
  const [period, setPeriod] = useState(7);
  const [reviewOnly, setReviewOnly] = useState(false);

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

        const { keys, start, end } = progressDateRange(period);

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
            .select("id, title, actual_minutes, time_confirmed_at, ended_at, session_type")
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
  }, [refreshToken, period]);

  const dailyProgress = useMemo(
    () => buildDailyProgress(dateKeys, sessions),
    [dateKeys, sessions],
  );
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const totalMinutes = sessions.reduce((total, session) => total + confirmedStudyMinutes(session), 0);
  const activeDays = dailyProgress.filter((day) => day.sessions > 0).length;
  const unlogged = sessions.filter((session) => !session.time_confirmed_at);
  const legacy = unlogged.filter((session) => session.actual_minutes !== null);
  const visibleSessions = reviewOnly ? unlogged : sessions;
  const unavailable = isLoading || Boolean(error);
  const hasActivity = sessions.length > 0;

  return (
    <div className="page-shell">
      <div className="page-container max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-gray-950">Progress</h1>
            <p className="py-2 text-xl text-gray-600">
              Small steps count. See what you finished, with study time you choose to log.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <label className="sr-only" htmlFor="progress-period">Progress period</label>
          <select id="progress-period" value={period} disabled={isLoading} onChange={(event) => setPeriod(Number(event.target.value))} className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm">
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option>
          </select>
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
          </div>
        </header>

        {error ? (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setRefreshToken((current) => current + 1)} className="font-semibold underline underline-offset-4">Try again</button>
          </div>
        ) : null}

        <section aria-label="Progress summary" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Clock3} label="Logged study time" value={unavailable ? "—" : formatMinutes(totalMinutes)} detail={unavailable ? "Waiting for progress" : `${unlogged.length} sessions without logged time`} tone="emerald" />
          <MetricCard icon={CheckCircle2} label="Sessions finished" value={unavailable ? "—" : String(sessions.length)} detail="Completed work counts, even without time" tone="blue" />
          <MetricCard icon={Sprout} label="Days you studied" value={unavailable ? "—" : String(activeDays)} detail={`Days with a finished session · last ${period} days`} tone="violet" />
          <MetricCard icon={CalendarCheck2} label="Scheduled tasks finished" value={unavailable ? "—" : `${completedTasks} / ${tasks.length}`} detail={`Of tasks scheduled in these ${period} days`} tone="amber" />
        </section>

        {!unavailable && legacy.length > 0 && <div className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm sm:flex-row sm:items-center">
          <CircleAlert className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="flex-1 text-amber-950"><p className="font-semibold">Old timers aren’t study time</p><p className="mt-1 leading-6">{legacy.length} older sessions have unverified time. Those timers could keep running while you were away. They’re excluded from totals until you log the minutes you studied.</p></div>
          <Button asChild variant="outline" className="self-start bg-white sm:self-center"><a href="#session-history" onClick={() => setReviewOnly(true)}>Review times <ArrowRight aria-hidden="true" /></a></Button>
        </div>}

        <div className="mt-6 grid gap-6">
          <section aria-labelledby="weekly-activity-heading" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="weekly-activity-heading" className="text-lg font-semibold">Your study activity</h2>
                <p className="mt-1 text-sm text-gray-500">Finished sessions and logged time, grouped by session completion date.</p>
              </div>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">Last {period} days</Badge>
            </div>

            {unavailable ? (
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

          <section id="session-history" aria-labelledby="recent-sessions-heading" className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 id="recent-sessions-heading" className="text-lg font-semibold">Session history</h2>
            <p className="mt-1 text-sm text-gray-500">Review your work. Add or adjust time whenever you need to.</p>
            <label className="mt-4 flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={reviewOnly} onChange={(event) => setReviewOnly(event.target.checked)} />Without logged time</label>

            <div className="mt-5">
              {unavailable ? (
                <div className="space-y-3" aria-label="Loading recent focus sessions">
                  {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" />)}
                </div>
              ) : visibleSessions.length ? (
                <ul className="divide-y divide-gray-100">
                  {visibleSessions.map((session) => (
                    <li key={session.id} className="py-3 first:pt-0">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          <Sparkles className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/study-session/${session.id}`} className="text-sm font-medium leading-6 text-gray-900 hover:underline">{session.title || sessionLabels[session.session_type]}</Link>
                          <p className="mt-0.5 text-xs text-gray-500">{formatSessionDate(session.ended_at)} · Session finished</p>
                          <SessionTimeEditor session={session} onSaved={(saved) => setSessions((current) => current.map((item) => item.id === session.id ? { ...item, actual_minutes: saved.actual_minutes, time_confirmed_at: saved.time_confirmed_at ?? null } : item))} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                  <CalendarCheck2 className="mx-auto size-6 text-gray-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-gray-900">{reviewOnly ? "All sessions in this period have logged time" : "No completed sessions in this period"}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">Completed work counts, whether or not you log time.</p>
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
  const [metric, setMetric] = useState<"sessions" | "minutes">("sessions");
  const maxScore = Math.max(...days.map((day) => day[metric]), 1);

  return (
    <div className="mt-8">
      <div className="mb-5 flex flex-wrap gap-2" aria-label="Chart measure">
        {(["sessions", "minutes"] as const).map((value) => <button type="button" key={value} aria-pressed={metric === value} onClick={() => setMetric(value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 aria-pressed:border-blue-500 aria-pressed:bg-blue-50 aria-pressed:text-blue-800">{value === "sessions" ? "Sessions" : "Logged minutes"}</button>)}
      </div>
      {metric === "minutes" && !days.some((day) => day.minutes > 0) && <p className="mb-4 text-sm text-gray-600">No time logged yet. Your finished sessions still count.</p>}
      <div className="overflow-x-auto pb-2">
      <div role="list" aria-label={`${metric === "sessions" ? "Completed sessions" : "Logged minutes"} by day`} className="flex h-56 items-end gap-2 sm:gap-4" style={{ minWidth: days.length > 7 ? 1080 : 340 }}>
        {days.map((day) => {
          const score = day[metric];
          const height = (score / maxScore) * 100;
          const fullLabel = `${day.dateKey}: ${day.sessions} completed sessions, ${day.minutes} logged minutes`;

          return (
            <div role="listitem" key={day.dateKey} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" aria-label={fullLabel}>
              <span className="text-xs font-medium tabular-nums text-gray-700">{score}</span>
              <div className="flex min-h-0 w-full flex-1 items-end rounded-xl bg-gray-100 p-1.5">
                <div
                  className={`w-full rounded-lg ${metric === "sessions" ? "bg-blue-500" : "bg-emerald-500"}`}
                  style={{ height: `${height}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-[11px] font-medium text-gray-500 sm:text-xs">{days.length > 7 ? Number(day.dateKey.slice(-2)) : day.label}</span>
              {days.length <= 7 && <span className="text-[10px] text-gray-500">{formatSessionDate(`${day.dateKey}T12:00:00`)}</span>}
            </div>
          );
        })}
      </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
        <span><strong className="font-semibold text-gray-800">{days.reduce((sum, day) => sum + day.sessions, 0)}</strong> sessions finished</span>
        <span><strong className="font-semibold text-gray-800">{formatMinutes(days.reduce((sum, day) => sum + day.minutes, 0))}</strong> logged</span>
        <span>{formatSessionDate(`${days[0]?.dateKey}T12:00:00`)} – {formatSessionDate(`${days.at(-1)?.dateKey}T12:00:00`)}</span>
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

function buildDailyProgress(dateKeys: string[], sessions: ProgressSession[]): DayProgress[] {
  return studyActivityByDay(dateKeys, sessions).map((day) => ({
    dateKey: day.key,
    label: new Date(`${day.key}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
    minutes: day.minutes,
    sessions: day.sessions,
  }));
}

function formatSessionDate(value: string | null) {
  if (!value) return "Recently";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
