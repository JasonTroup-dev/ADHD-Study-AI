"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GuidedSessionController } from "./types";

export function SessionCompletionBanner({ controller }: { controller: GuidedSessionController }) {
  if (!controller.completionUnlocked) return null;
  return (
    <div className="mx-auto -mb-8 flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:max-w-xl xl:max-w-4xl">
      <div>
        <p className="text-sm font-medium text-emerald-950">Ready to complete</p>
        {controller.completionReason ? <p className="mt-0.5 text-xs text-emerald-700">{controller.completionReason}</p> : null}
      </div>
      <Button type="button" className="rounded-full bg-emerald-700 text-white hover:bg-emerald-800" disabled={controller.isCompleting} onClick={() => void controller.completeSession()}>
        <Check /> {controller.isCompleting ? "Saving..." : "Complete session"}
      </Button>
    </div>
  );
}
