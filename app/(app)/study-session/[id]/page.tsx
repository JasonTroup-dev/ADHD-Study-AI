"use client";

import { Clock3 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { GuidedStudySession } from "@/components/study-sessions/GuidedStudySession";
import { Button } from "@/components/ui/button";
import { getStudySessionById } from "@/lib/studySessions";
import type { StudySession } from "@/types/database";

export default function StudySessionPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<StudySession | null>(null);
  const [plannerTaskId, setPlannerTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        setPlannerTaskId(
          window.localStorage.getItem(`study-session-task:${params.id}`),
        );
        const studySession = await getStudySessionById(params.id);

        if (!isMounted) return;

        if (!studySession) {
          setError("Study session not found or unavailable.");
        } else {
          setSession(studySession);
        }
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the study session.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSession();
    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f7f7f8] text-gray-500">
        <Clock3 className="mr-3 h-5 w-5 animate-pulse" />
        Loading study session...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f7f7f8] px-6">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-red-700">{error}</p>
          <Button asChild variant="outline" className="mt-6 rounded-full">
            <Link href="/planner">Back to planner</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (session?.status === "active") {
    return (
      <GuidedStudySession
        session={session}
        plannerTaskId={plannerTaskId}
      />
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#f7f7f8] px-6">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">
          This session is {session?.status ?? "unavailable"}.
        </h1>
        {session?.actual_minutes ? (
          <p className="mt-2 text-gray-600">
            {session.actual_minutes} minutes studied
          </p>
        ) : null}
        <Button asChild className="mt-6 rounded-full">
          <Link href="/dashboard">View dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
