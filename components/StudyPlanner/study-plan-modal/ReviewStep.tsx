"use client";

import { ArrowLeft, FileText, ListChecks, LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AssignmentReviewCard } from "./AssignmentReviewCard";
import { CourseSetupCard } from "./CourseSetupCard";
import { ErrorMessage } from "./ErrorMessage";
import type {
  ClassOption,
  StudyPlannerModalActions,
  StudyPlannerModalState,
} from "./types";

export function ReviewStep({
  classes,
  state,
  actions,
}: {
  classes: ClassOption[];
  state: StudyPlannerModalState;
  actions: StudyPlannerModalActions;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid items-start gap-5 p-5 sm:p-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <CourseSetupCard
            course={state.course}
            classMatch={state.classMatch}
            classes={classes}
            classResolution={state.classResolution}
            selectedClassId={state.selectedClassId}
            newClassName={state.newClassName}
            newClassCode={state.newClassCode}
            newClassInstructor={state.newClassInstructor}
            newClassColor={state.newClassColor}
            maxTasksPerDay={state.maxTasksPerDay}
            isBusy={state.isBusy}
            onClassResolutionChange={actions.chooseClassResolution}
            onSelectedClassChange={actions.setSelectedClassId}
            onNewClassNameChange={actions.setNewClassName}
            onNewClassCodeChange={actions.setNewClassCode}
            onNewClassInstructorChange={actions.setNewClassInstructor}
            onNewClassColorChange={actions.setNewClassColor}
            onMaxTasksPerDayChange={actions.setMaxTasksPerDay}
          />

          <section className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Step 2 of 2</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Review your assignments</h2>
                <p className="mt-1 text-sm text-slate-500">Check the details we found before building your schedule.</p>
              </div>
              <div className="flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="max-w-48 truncate">{state.analysisFileName}</span>
                <span className="font-semibold text-slate-700">· {state.assignments.length} found</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {state.assignments.map((assignment, index) => (
                <AssignmentReviewCard
                  key={assignment.id}
                  assignment={assignment}
                  index={index}
                  isBusy={state.isBusy}
                  onChange={(patch) => actions.updateAssignment(assignment.id, patch)}
                  onRemove={() => actions.removeAssignment(assignment.id)}
                />
              ))}
            </div>

            <label className={`mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition ${state.isReviewConfirmed ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200 hover:border-slate-300"}`}>
              <input type="checkbox" checked={state.isReviewConfirmed} disabled={state.isBusy} onChange={(event) => actions.setIsReviewConfirmed(event.target.checked)} className="mt-0.5 size-4 rounded border-slate-300 accent-emerald-600" />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Everything looks right</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">I reviewed the course, workload, and assignment details above.</span>
              </span>
            </label>
            {state.error ? <ErrorMessage message={state.error} /> : null}
          </section>
        </div>
      </div>

      <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Button type="button" variant="outline" onClick={actions.goBack} disabled={state.isBusy}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to upload
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="hidden items-center gap-2 pr-2 text-xs text-slate-500 md:flex">
            <ListChecks className="size-4" aria-hidden="true" />
            {state.assignments.length} assignment{state.assignments.length === 1 ? "" : "s"} ready
          </div>
          <Button
            type="button"
            onClick={() => void actions.createStudyPlan()}
            disabled={state.isBusy || state.assignments.length === 0 || !state.classResolution || !state.isReviewConfirmed}
            className="min-w-48 bg-blue-600 text-white hover:bg-blue-700"
          >
            {state.isImporting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            {state.isImporting ? "Building your plan..." : "Create study plan"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
