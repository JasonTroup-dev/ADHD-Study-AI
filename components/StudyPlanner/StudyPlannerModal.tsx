"use client";

import { Sparkles, X } from "lucide-react";

import { ReviewStep } from "@/components/StudyPlanner/study-plan-modal/ReviewStep";
import { StepIndicator } from "@/components/StudyPlanner/study-plan-modal/StepIndicator";
import type { StudyPlannerModalProps } from "@/components/StudyPlanner/study-plan-modal/types";
import { UploadStep } from "@/components/StudyPlanner/study-plan-modal/UploadStep";
import { useStudyPlannerModal } from "@/components/StudyPlanner/study-plan-modal/useStudyPlannerModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export default function StudyPlannerModal({
  isOpen,
  classes,
  onClose,
  onStudyPlanCreated,
}: StudyPlannerModalProps) {
  const { state, actions } = useStudyPlannerModal({
    onClose,
    onStudyPlanCreated,
  });

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) actions.closeModal();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-busy={state.isBusy}
        onEscapeKeyDown={(event) => {
          if (state.isBusy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (state.isBusy) event.preventDefault();
        }}
        className={`h-[calc(100svh-1rem)] max-h-[calc(100svh-1rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden gap-0 border-slate-200 bg-slate-50 p-0 sm:max-h-[calc(100svh-3rem)] ${
          state.step === "upload"
            ? "max-w-4xl sm:h-auto sm:grid-rows-none"
            : "max-w-6xl sm:h-[calc(100svh-3rem)]"
        }`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg text-slate-950">
                Build your study plan
              </DialogTitle>
              <DialogDescription className="mt-1 hidden text-xs text-slate-500 sm:block">
                Turn one syllabus into a realistic, ready-to-use schedule.
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StepIndicator step={state.step} />
            <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={actions.closeModal}
              disabled={state.isBusy}
              aria-label="Close generate study plan dialog"
              className="rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        {state.step === "upload" ? (
          <UploadStep
            sourceFile={state.sourceFile}
            isDragging={state.isDragging}
            isAnalyzing={state.isAnalyzing}
            uploadProgress={state.uploadProgress}
            error={state.error}
            onSubmit={actions.analyzeSyllabus}
            onClose={actions.closeModal}
            onCancelAnalysis={actions.cancelAnalysis}
            onDraggingChange={actions.setIsDragging}
            onFileChange={actions.updateSourceFile}
          />
        ) : (
          <ReviewStep classes={classes} state={state} actions={actions} />
        )}
      </DialogContent>
    </Dialog>
  );
}
