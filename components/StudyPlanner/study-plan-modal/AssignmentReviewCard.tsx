"use client";

import { ChevronDown, CircleAlert, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SyllabusAssignmentDifficulty, SyllabusItemKind } from "@/types/syllabus";

import { selectClassName } from "./CourseSetupCard";
import type { ReviewAssignment } from "./types";
import { getAssignmentReviewWarning } from "./validation";

const difficultyOptions: SyllabusAssignmentDifficulty[] = ["easy", "medium", "hard"];
const itemKindOptions: SyllabusItemKind[] = ["assignment", "exam", "quiz"];

export function AssignmentReviewCard({
  assignment,
  index,
  isBusy,
  onChange,
  onRemove,
}: {
  assignment: ReviewAssignment;
  index: number;
  isBusy: boolean;
  onChange: (patch: Partial<Omit<ReviewAssignment, "id">>) => void;
  onRemove: () => void;
}) {
  const warning = getAssignmentReviewWarning(assignment);
  const confidence = Math.round(assignment.confidence * 100);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">{index + 1}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{assignment.title || `Assignment ${index + 1}`}</p>
            <p className={`mt-0.5 text-[11px] font-medium ${confidence >= 80 ? "text-emerald-600" : "text-amber-600"}`}>{confidence}% extraction confidence</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" disabled={isBusy} aria-label={`Remove ${assignment.title || "assignment"}`} onClick={onRemove} className="text-slate-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
      {warning ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{warning}</span>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <Label htmlFor={`${assignment.id}-title`} className="text-xs text-slate-600">Assignment title</Label>
          <Input id={`${assignment.id}-title`} value={assignment.title} disabled={isBusy} onChange={(event) => onChange({ title: event.target.value })} className="mt-1.5" />
        </div>
        <div className="xl:col-span-3">
          <Label htmlFor={`${assignment.id}-kind`} className="text-xs text-slate-600">Type</Label>
          <div className="relative mt-1.5">
            <select id={`${assignment.id}-kind`} value={assignment.kind} disabled={isBusy} onChange={(event) => onChange({ kind: event.target.value as SyllabusItemKind })} className={selectClassName}>
              {itemKindOptions.map((kind) => <option key={kind} value={kind}>{capitalize(kind)}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          </div>
        </div>
        <div className="xl:col-span-3">
          <Label htmlFor={`${assignment.id}-due-date`} className="text-xs text-slate-600">Due date</Label>
          <Input id={`${assignment.id}-due-date`} type="date" value={assignment.dueDate ?? ""} disabled={isBusy} onChange={(event) => onChange({ dueDate: event.target.value || null, dueDateStatus: event.target.value ? "explicit" : "missing" })} className="mt-1.5" />
        </div>
        <div className="xl:col-span-3">
          <Label htmlFor={`${assignment.id}-points`} className="text-xs text-slate-600">Points <span className="font-normal text-slate-400">(optional)</span></Label>
          <Input id={`${assignment.id}-points`} type="number" min="0" value={assignment.points ?? ""} disabled={isBusy} onChange={(event) => onChange({ points: event.target.value === "" ? null : Number(event.target.value) })} className="mt-1.5" />
        </div>
        <div className="xl:col-span-3">
          <Label htmlFor={`${assignment.id}-difficulty`} className="text-xs text-slate-600">Difficulty</Label>
          <div className="relative mt-1.5">
            <select id={`${assignment.id}-difficulty`} value={assignment.difficulty} disabled={isBusy} onChange={(event) => onChange({ difficulty: event.target.value as SyllabusAssignmentDifficulty })} className={selectClassName}>
              {difficultyOptions.map((difficulty) => <option key={difficulty} value={difficulty}>{capitalize(difficulty)}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          </div>
        </div>
        <div className="sm:col-span-2 xl:col-span-6">
          <Label htmlFor={`${assignment.id}-notes`} className="text-xs text-slate-600">Notes <span className="font-normal text-slate-400">(optional)</span></Label>
          <Textarea id={`${assignment.id}-notes`} value={assignment.notes} disabled={isBusy} rows={1} onChange={(event) => onChange({ notes: event.target.value })} placeholder="Reading, chapters, or anything helpful" className="mt-1.5 min-h-9 resize-none" />
        </div>
      </div>
    </article>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
