import { CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";

import TutorWorkspace from "@/components/ai-tutor/TutorWorkspace";
import { Button } from "@/components/ui/button";
import { normalizeStudySessionMessages } from "@/lib/studySessions";
import type { StudySession } from "@/types/database";

export function StudySessionReview({ session }: { session: StudySession }) {
  const messages = normalizeStudySessionMessages(session.messages);
  const sessionDetails = (
    <div className="mb-7 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Completed study session
          </p>
          <p className="mt-1 text-emerald-800">
            {session.title ?? "Study session"}
            {session.time_confirmed_at ? ` · ${session.actual_minutes} minutes logged` : " · Time not logged"}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/planner">Back to planner</Link>
        </Button>
      </div>
    </div>
  );

  return (
    <TutorWorkspace
      messages={messages}
      isLoading={false}
      onAskTutor={undefined}
      emptyTitle="No saved conversation"
      emptyActions={(
        <p className="mt-3 max-w-md text-center text-sm text-gray-600">
          This session was completed before any tutor messages were saved.
        </p>
      )}
      conversationHeader={sessionDetails}
      composerHeader={messages.length === 0 ? sessionDetails : undefined}
      composer={(
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
          <Clock3 className="size-4" aria-hidden="true" />
          This completed session is read-only.
        </div>
      )}
    />
  );
}
