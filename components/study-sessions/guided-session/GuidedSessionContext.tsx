"use client";

import { BookOpen, FileUp } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ASSIGNMENT_FILE_ACCEPT, STUDY_FILE_ACCEPT } from "@/lib/files/uploadConstraints";

import { formatPlanDate } from "./domain";
import type { GuidedSessionController } from "./types";

export function MissingContextActions({
  controller,
}: {
  controller: GuidedSessionController;
}) {
  const assignmentInputRef = useRef<HTMLInputElement | null>(null);
  const materialsInputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={controller.isUploading} onClick={() => assignmentInputRef.current?.click()}>
        <FileUp /> Upload assignment
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={controller.isUploading} onClick={() => materialsInputRef.current?.click()}>
        <BookOpen /> Add materials
      </Button>
      <input ref={assignmentInputRef} type="file" className="sr-only" accept={ASSIGNMENT_FILE_ACCEPT} onChange={(event) => { void controller.uploadAssignmentFile(event.target.files?.[0] ?? null); event.target.value = ""; }} />
      <input ref={materialsInputRef} type="file" className="sr-only" accept={STUDY_FILE_ACCEPT} multiple onChange={(event) => { void controller.uploadStudyMaterials(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    </div>
  );
}

export function GuidedSessionContextHeader({
  controller,
}: {
  controller: GuidedSessionController;
}) {
  const materialsInputRef = useRef<HTMLInputElement | null>(null);
  const assignment = controller.assignment;

  return (
    <>
      {controller.contextError ? <Notice tone="error">{controller.contextError}</Notice> : null}
      {!controller.isContextLoading && assignment?.hasExtractedText ? (
        <Notice>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-gray-900">Grounded in {assignment.originalFileName ?? "the assignment instructions"}</p>
              <p className="mt-1">{assignment.materials.length} linked study material{assignment.materials.length === 1 ? "" : "s"}.</p>
            </div>
            <Button type="button" size="sm" variant="outline" disabled={controller.isUploading} onClick={() => materialsInputRef.current?.click()}>
              <BookOpen /> Add materials
            </Button>
          </div>
          <input ref={materialsInputRef} type="file" className="sr-only" accept={STUDY_FILE_ACCEPT} multiple onChange={(event) => { void controller.uploadStudyMaterials(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
        </Notice>
      ) : null}
      {controller.isPlanLoading ? <Notice>Reading the instructions and preparing a planner update…</Notice> : null}
      {controller.planRefinement ? (
        <div className="mb-7 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold">Refine your future planner blocks?</p>
              <p className="mt-1 text-blue-800">{controller.planRefinement.summary}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" variant="ghost" disabled={controller.isPlanApplying} onClick={controller.dismissPlanRefinement}>Keep current</Button>
              <Button type="button" size="sm" disabled={controller.isPlanApplying} onClick={() => void controller.applyPlanRefinement()}>{controller.isPlanApplying ? "Updating…" : "Update plan"}</Button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {controller.planRefinement.tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-blue-100 bg-white px-3 py-2">
                <p className="text-xs font-medium text-blue-600">{formatPlanDate(task.scheduledDate)}</p>
                <p className="mt-1 font-medium text-gray-950">{task.proposedTitle}</p>
                <p className="mt-1 text-xs text-gray-500 line-through">{task.currentTitle}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-blue-700">Completed, manually created, and current-session tasks will not change.</p>
        </div>
      ) : null}
    </>
  );
}

function Notice({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return (
    <div className={tone === "error" ? "mb-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" : "mb-7 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600"}>
      {children}
    </div>
  );
}
