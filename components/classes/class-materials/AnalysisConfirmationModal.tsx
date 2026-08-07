"use client";

import type { FormEvent } from "react";
import { FileText, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
  AnalysisKind,
  ClassAssignmentOption,
  ConfirmationItem,
} from "./types";
import {
  deriveTitleFromFileName,
  formatDueDate,
  isAssignmentFileCompatible,
} from "./validation";

const NEW_ASSIGNMENT_VALUE = "__new_assignment__";

export function AnalysisConfirmationModal({
  isOpen,
  items,
  files,
  assignments,
  error,
  isSaving,
  onClose,
  onItemChange,
  onSubmit,
}: {
  isOpen: boolean;
  items: ConfirmationItem[];
  files: File[];
  assignments: ClassAssignmentOption[];
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onItemChange: (clientId: string, patch: Partial<ConfirmationItem>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="material-analysis-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="material-analysis-title" className="text-2xl font-semibold text-slate-950">
              Confirm Upload Details
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Review what the AI found before saving.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close upload confirmation"
            disabled={isSaving}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {items.map((item) => {
            const file = files[item.fileIndex];
            const canUseAsAssignmentFile = file
              ? isAssignmentFileCompatible(file.name)
              : true;

            return (
              <section key={item.clientId} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                      <h3 className="truncate text-base font-semibold text-slate-950">
                        {item.originalFileName}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.reason}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Save as</span>
                    <select
                      value={item.kind}
                      disabled={isSaving}
                      onChange={(event) =>
                        onItemChange(item.clientId, {
                          kind: event.target.value as AnalysisKind,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                    >
                      <option value="study_material">Notes or material</option>
                      {canUseAsAssignmentFile ? (
                        <option value="assignment_file">Assignment instructions</option>
                      ) : null}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Related assignment</span>
                    <select
                      value={
                        item.target === "new_assignment"
                          ? NEW_ASSIGNMENT_VALUE
                          : item.assignmentId ?? ""
                      }
                      disabled={isSaving}
                      onChange={(event) => {
                        if (event.target.value === NEW_ASSIGNMENT_VALUE) {
                          onItemChange(item.clientId, {
                            target: "new_assignment",
                            assignmentId: null,
                            newAssignmentTitle:
                              item.newAssignmentTitle ??
                              deriveTitleFromFileName(item.originalFileName),
                          });
                          return;
                        }
                        onItemChange(item.clientId, {
                          target: "existing_assignment",
                          assignmentId: event.target.value,
                        });
                      }}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                    >
                      {assignments.map((assignment) => (
                        <option key={assignment.id} value={assignment.id}>
                          {assignment.title}
                          {assignment.dueDate
                            ? ` - due ${formatDueDate(assignment.dueDate)}`
                            : ""}
                        </option>
                      ))}
                      <option value={NEW_ASSIGNMENT_VALUE}>Create new assignment</option>
                    </select>
                  </label>
                </div>

                {item.target === "new_assignment" ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Assignment title</span>
                      <input
                        value={item.newAssignmentTitle ?? deriveTitleFromFileName(item.originalFileName)}
                        disabled={isSaving}
                        required
                        onChange={(event) =>
                          onItemChange(item.clientId, { newAssignmentTitle: event.target.value })
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Due date</span>
                      <input
                        type="date"
                        value={item.dueDate ?? ""}
                        disabled={isSaving}
                        required
                        onChange={(event) =>
                          onItemChange(item.clientId, { dueDate: event.target.value })
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                      />
                    </label>
                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">Notes</span>
                      <textarea
                        value={item.description}
                        disabled={isSaving}
                        rows={3}
                        onChange={(event) =>
                          onItemChange(item.clientId, { description: event.target.value })
                        }
                        className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                ) : null}
              </section>
            );
          })}

          {error ? <p className="text-sm font-medium text-red-600" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || items.length === 0}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {isSaving ? "Saving..." : "Save Files"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
