"use client";

import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import AssignmentModal from "@/components/assignments/AssignmentModal";
import { Button } from "@/components/ui/button";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  MAX_TUTOR_FILES,
  STUDY_FILE_ACCEPT,
  SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS,
  SUPPORTED_STUDY_FILE_EXTENSIONS,
  SUPPORTED_STUDY_FILE_LABEL,
} from "@/lib/files/uploadConstraints";
import type {
  AssignmentClassOption,
  NewAssignment,
} from "@/types/assignments";

export type ClassMaterial = {
  id: string;
  title: string;
  meta: string;
  kind: "assignment_file" | "study_material" | "note";
};

export type ClassAssignmentOption = {
  id: string;
  title: string;
  dueDate: string | null;
  hasAssignmentFile: boolean;
};

type ClassMaterialsPanelProps = {
  classId: string;
  className: string;
  assignments: ClassAssignmentOption[];
  materials: ClassMaterial[];
};

type AnalysisKind = "assignment_file" | "study_material";
type AnalysisTarget = "existing_assignment" | "new_assignment";

type AnalysisSuggestion = {
  fileIndex: number;
  originalFileName: string;
  kind: AnalysisKind;
  target: AnalysisTarget;
  assignmentId: string | null;
  newAssignmentTitle: string | null;
  dueDate: string | null;
  description: string;
  confidence: number;
  reason: string;
};

type ConfirmationItem = AnalysisSuggestion & {
  clientId: string;
};

type CreateAssignmentResponse = {
  assignment?: {
    id: string;
    title: string;
    due_date: string | null;
    original_file_name: string | null;
  };
  error?: string;
  warning?: string | null;
};

type MaterialsResponse = {
  materials?: Array<{ id: string }>;
  warnings?: string[];
  error?: string;
};

const NEW_ASSIGNMENT_VALUE = "__new_assignment__";

export default function ClassMaterialsPanel({
  classId,
  className,
  assignments,
  materials,
}: ClassMaterialsPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [assignmentOptions, setAssignmentOptions] = useState(assignments);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [confirmationItems, setConfirmationItems] = useState<
    ConfirmationItem[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const assignmentClassOption: AssignmentClassOption = {
    id: classId,
    name: className,
    color: null,
  };

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void analyzeFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  async function analyzeFiles(files: File[]) {
    const validationError = validateFiles(files);

    if (validationError) {
      setError(validationError);
      setNotice(null);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch(
        `/api/classes/${classId}/materials/analyze`,
        {
          method: "POST",
          body: formData,
        },
      );
      const payload = (await readJson(response)) as {
        suggestions?: AnalysisSuggestion[];
        error?: string;
      };

      if (!response.ok || !payload.suggestions) {
        throw new Error(payload.error ?? "The files could not be analyzed.");
      }

      const items = payload.suggestions.map((suggestion) =>
        toConfirmationItem(suggestion, files),
      );

      setSelectedFiles(files);
      setConfirmationItems(items);
      setIsConfirmOpen(true);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "The files could not be analyzed.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function updateConfirmationItem(
    clientId: string,
    patch: Partial<ConfirmationItem>,
  ) {
    setConfirmationItems((current) =>
      current.map((item) =>
        item.clientId === clientId ? { ...item, ...patch } : item,
      ),
    );
    setError(null);
  }

  async function handleConfirmUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      let savedCount = 0;
      const notices: string[] = [];

      for (const item of confirmationItems) {
        const file = selectedFiles[item.fileIndex];
        if (!file) continue;

        const resolved = await resolveAssignmentForItem(item, file);

        if (item.kind === "assignment_file") {
          if (!resolved.assignmentFileUploaded) {
            await uploadAssignmentFile(resolved.assignmentId, file);
          }
        } else {
          const materialNotice = await uploadStudyMaterials(
            resolved.assignmentId,
            [file],
          );
          if (materialNotice) notices.push(materialNotice);
        }

        savedCount += 1;
      }

      setSelectedFiles([]);
      setConfirmationItems([]);
      setIsConfirmOpen(false);
      setNotice(
        notices.length > 0
          ? notices.join(" ")
          : `${savedCount} file${savedCount === 1 ? "" : "s"} saved.`,
      );
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The files could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function resolveAssignmentForItem(item: ConfirmationItem, file: File) {
    if (item.target === "existing_assignment") {
      if (!item.assignmentId) {
        throw new Error(`${item.originalFileName} needs an assignment.`);
      }

      return {
        assignmentId: item.assignmentId,
        assignmentFileUploaded: false,
      };
    }

    return createAssignmentForItem(item, file);
  }

  async function createAssignmentForItem(item: ConfirmationItem, file: File) {
    const title =
      item.newAssignmentTitle?.trim() || deriveTitleFromFileName(file.name);
    const dueDate = item.dueDate?.trim();

    if (!dueDate) {
      throw new Error(`${file.name} needs a due date before saving.`);
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", item.description.trim());
    formData.append("class_id", classId);
    formData.append("due_date", dueDate);
    formData.append("importance", "medium");
    formData.append("points", "");

    if (item.kind === "assignment_file") {
      formData.append("file", file);
    }

    const response = await fetch("/api/assignments/create", {
      method: "POST",
      body: formData,
    });
    const payload = (await readJson(response)) as CreateAssignmentResponse;

    if (!response.ok || !payload.assignment) {
      throw new Error(payload.error ?? `Could not create ${title}.`);
    }

    const createdAssignment = {
      id: payload.assignment.id,
      title: payload.assignment.title,
      dueDate: payload.assignment.due_date,
      hasAssignmentFile: Boolean(payload.assignment.original_file_name),
    };

    setAssignmentOptions((current) =>
      current.some((assignment) => assignment.id === createdAssignment.id)
        ? current
        : [...current, createdAssignment],
    );

    return {
      assignmentId: payload.assignment.id,
      assignmentFileUploaded: item.kind === "assignment_file",
    };
  }

  async function uploadAssignmentFile(assignmentId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/assignments/${assignmentId}/file`, {
      method: "POST",
      body: formData,
    });
    const payload = (await readJson(response)) as {
      file?: { originalFileName: string };
      warning?: string | null;
      error?: string;
    };

    if (!response.ok || !payload.file) {
      throw new Error(
        payload.error ?? "The assignment file could not be uploaded.",
      );
    }

    setAssignmentOptions((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId
          ? { ...assignment, hasAssignmentFile: true }
          : assignment,
      ),
    );
  }

  async function uploadStudyMaterials(assignmentId: string, files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await fetch(`/api/assignments/${assignmentId}/materials`, {
      method: "POST",
      body: formData,
    });
    const payload = (await readJson(response)) as MaterialsResponse;

    if (!response.ok || !payload.materials) {
      throw new Error(payload.error ?? "The study materials could not be uploaded.");
    }

    return payload.warnings?.join(" ") ?? "";
  }

  async function handleAddAssignment(newAssignment: NewAssignment) {
    setIsCreatingAssignment(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("title", newAssignment.title);
      formData.append("description", newAssignment.description ?? "");
      formData.append("class_id", classId);
      formData.append("due_date", newAssignment.dueDate);
      formData.append("importance", newAssignment.importance);
      formData.append(
        "points",
        newAssignment.points === null ? "" : String(newAssignment.points),
      );

      if (newAssignment.file) {
        formData.append("file", newAssignment.file);
      }

      const response = await fetch("/api/assignments/create", {
        method: "POST",
        body: formData,
      });
      const payload = (await readJson(response)) as CreateAssignmentResponse;

      if (!response.ok || !payload.assignment) {
        setError(payload.error ?? "Could not add this assignment.");
        return;
      }

      let materialsNotice = "";
      if (newAssignment.materials.length > 0) {
        try {
          const materialNotice = await uploadStudyMaterials(
            payload.assignment.id,
            newAssignment.materials,
          );
          materialsNotice = materialNotice
            ? ` ${materialNotice}`
            : ` ${newAssignment.materials.length} study material${newAssignment.materials.length === 1 ? "" : "s"} attached.`;
        } catch {
          materialsNotice =
            " The assignment was saved, but its materials could not be uploaded.";
        }
      }

      const createdAssignment = {
        id: payload.assignment.id,
        title: payload.assignment.title,
        dueDate: payload.assignment.due_date,
        hasAssignmentFile: Boolean(payload.assignment.original_file_name),
      };

      setAssignmentOptions((current) => [...current, createdAssignment]);
      setNotice(`${payload.warning ?? "Assignment saved."}${materialsNotice}`);
      setIsAssignmentModalOpen(false);
      router.refresh();
    } catch (submitError) {
      console.error("Error adding class assignment:", submitError);
      setError("Could not add this assignment. Please try again.");
    } finally {
      setIsCreatingAssignment(false);
    }
  }

  return (
    <div id="materials">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-slate-950">
          Notes & Materials
        </h2>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
          onClick={() => setIsAssignmentModalOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Assignment
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept={STUDY_FILE_ACCEPT}
        multiple
        disabled={isAnalyzing || isSaving}
        onChange={handleFileChange}
      />

      <button
        type="button"
        disabled={isAnalyzing || isSaving}
        className={`group flex min-h-44 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center shadow-sm transition duration-200 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.995] ${
          isDragging
            ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
            : "border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-white hover:shadow-md hover:shadow-blue-100/70"
        } disabled:cursor-not-allowed disabled:opacity-70`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isAnalyzing && !isSaving) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!isAnalyzing && !isSaving) {
            void analyzeFiles(Array.from(event.dataTransfer.files ?? []));
          }
        }}
      >
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-xl border transition ${
            isDragging
              ? "border-blue-200 bg-white text-blue-700"
              : "border-blue-100 bg-white text-blue-600 group-hover:border-blue-200 group-hover:text-blue-700"
          }`}
          aria-hidden="true"
        >
          {isAnalyzing ? (
            <Loader2
              className="h-7 w-7 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Upload className="h-7 w-7" aria-hidden="true" />
          )}
        </span>
        <span className="mt-4 text-lg font-semibold text-slate-950">
          {isAnalyzing
            ? "Analyzing files..."
            : "Drop files here or click to upload"}
        </span>
        <span className="mt-2 text-sm text-slate-600">
          {SUPPORTED_STUDY_FILE_LABEL}, up to {MAX_TUTOR_FILES} files
        </span>
        <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition group-hover:bg-blue-700">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Choose files
        </span>
      </button>

      {error && !isConfirmOpen ? (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="mt-3 text-sm font-medium text-blue-700" role="status">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {materials.length > 0 ? (
          materials.map((material) => (
            <MaterialRow key={material.id} material={material} />
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-950">
              No materials uploaded yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Add assignment instructions, notes, readings, slides, or examples.
            </p>
          </div>
        )}
      </div>

      <AnalysisConfirmationModal
        isOpen={isConfirmOpen}
        items={confirmationItems}
        files={selectedFiles}
        assignments={assignmentOptions}
        error={error}
        isSaving={isSaving}
        onClose={() => {
          if (!isSaving) {
            setIsConfirmOpen(false);
            setError(null);
          }
        }}
        onItemChange={updateConfirmationItem}
        onSubmit={handleConfirmUpload}
      />

      <AssignmentModal
        key={isAssignmentModalOpen ? "class-assignment-open" : "class-assignment-closed"}
        isOpen={isAssignmentModalOpen}
        classes={[assignmentClassOption]}
        defaultClassId={classId}
        allowNoClass={false}
        isSubmitting={isCreatingAssignment}
        error={error}
        onClearError={() => setError(null)}
        onClose={() => {
          if (!isCreatingAssignment) {
            setIsAssignmentModalOpen(false);
            setError(null);
          }
        }}
        onSubmit={handleAddAssignment}
      />
    </div>
  );
}

function AnalysisConfirmationModal({
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
            <h2
              id="material-analysis-title"
              className="text-2xl font-semibold text-slate-950"
            >
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
              <section
                key={item.clientId}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText
                        className="h-4 w-4 shrink-0 text-slate-500"
                        aria-hidden="true"
                      />
                      <h3 className="truncate text-base font-semibold text-slate-950">
                        {item.originalFileName}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {item.reason}
                    </p>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Save as
                    </span>
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
                        <option value="assignment_file">
                          Assignment instructions
                        </option>
                      ) : null}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Related assignment
                    </span>
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
                      <option value={NEW_ASSIGNMENT_VALUE}>
                        Create new assignment
                      </option>
                    </select>
                  </label>
                </div>

                {item.target === "new_assignment" ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Assignment title
                      </span>
                      <input
                        value={
                          item.newAssignmentTitle ??
                          deriveTitleFromFileName(item.originalFileName)
                        }
                        disabled={isSaving}
                        required
                        onChange={(event) =>
                          onItemChange(item.clientId, {
                            newAssignmentTitle: event.target.value,
                          })
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Due date
                      </span>
                      <input
                        type="date"
                        value={item.dueDate ?? ""}
                        disabled={isSaving}
                        required
                        onChange={(event) =>
                          onItemChange(item.clientId, {
                            dueDate: event.target.value,
                          })
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                      />
                    </label>

                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Notes
                      </span>
                      <textarea
                        value={item.description}
                        disabled={isSaving}
                        rows={3}
                        onChange={(event) =>
                          onItemChange(item.clientId, {
                            description: event.target.value,
                          })
                        }
                        className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                ) : null}
              </section>
            );
          })}

          {error ? (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || items.length === 0}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {isSaving ? "Saving..." : "Save Files"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MaterialRow({ material }: { material: ClassMaterial }) {
  return (
    <article className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-950">
            {material.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{material.meta}</p>
        </div>
      </div>

      <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
        {material.kind === "assignment_file"
          ? "Assignment"
          : material.kind === "study_material"
            ? "Material"
            : "Note"}
      </span>
    </article>
  );
}

function toConfirmationItem(
  suggestion: AnalysisSuggestion,
  files: File[],
): ConfirmationItem {
  const file = files[suggestion.fileIndex];
  const canUseAsAssignmentFile = file
    ? isAssignmentFileCompatible(file.name)
    : true;
  const kind =
    suggestion.kind === "assignment_file" && !canUseAsAssignmentFile
      ? "study_material"
      : suggestion.kind;

  return {
    ...suggestion,
    kind,
    originalFileName: file?.name ?? suggestion.originalFileName,
    clientId: `${suggestion.fileIndex}-${suggestion.originalFileName}`,
    newAssignmentTitle:
      suggestion.newAssignmentTitle ??
      deriveTitleFromFileName(file?.name ?? suggestion.originalFileName),
  };
}

function validateFiles(files: File[]) {
  if (files.length === 0) return null;

  if (files.length > MAX_TUTOR_FILES) {
    return `Upload ${MAX_TUTOR_FILES} files or fewer at a time.`;
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_STUDY_FILE_BYTES) {
    return `Files must be ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller in total.`;
  }

  for (const file of files) {
    const extension = getFileExtension(file.name);

    if (
      !SUPPORTED_STUDY_FILE_EXTENSIONS.includes(
        extension as (typeof SUPPORTED_STUDY_FILE_EXTENSIONS)[number],
      )
    ) {
      return `${file.name} is not supported. Upload ${SUPPORTED_STUDY_FILE_LABEL} files.`;
    }

    if (file.size > MAX_STUDY_FILE_BYTES) {
      return `${file.name} must be ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller.`;
    }
  }

  return null;
}

function isAssignmentFileCompatible(fileName: string) {
  const extension = getFileExtension(fileName);
  return SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS.includes(
    extension as (typeof SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS)[number],
  );
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
}

function formatDueDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey.slice(0, 10)}T00:00:00`));
}

function deriveTitleFromFileName(fileName: string) {
  const title = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return title || "Uploaded assignment";
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
