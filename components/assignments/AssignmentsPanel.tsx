"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import AssignmentList from "@/components/assignments/AssignmentList";
import AssignmentModal from "@/components/assignments/AssignmentModal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import type {
  Assignment,
  AssignmentClassOption,
  AssignmentImportance,
  NewAssignment,
} from "@/types/assignments";

const importanceRank: Record<AssignmentImportance, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const assignmentSelect = `
  id,
  user_id,
  class_id,
  title,
  description,
  due_date,
  importance,
  points,
  status,
  original_file_name,
  file_type,
  file_size_bytes,
  storage_path,
  extracted_text,
  context_status,
  context_version,
  created_at,
  updated_at,
  classes (
    name,
    color
  )
`;

async function fetchAssignments(userId: string) {
  const { data, error } = await supabase
    .from("assignments")
    .select(assignmentSelect)
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []) as Assignment[];
}

async function fetchClasses(userId: string) {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, color")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AssignmentClassOption[];
}

function sortAssignments(assignments: Assignment[]) {
  return [...assignments].sort((first, second) => {
    const completionDifference =
      Number(first.status === "completed") -
      Number(second.status === "completed");
    if (completionDifference !== 0) return completionDifference;

    const firstDueDate = first.due_date
      ? new Date(first.due_date).getTime()
      : Number.POSITIVE_INFINITY;
    const secondDueDate = second.due_date
      ? new Date(second.due_date).getTime()
      : Number.POSITIVE_INFINITY;
    if (firstDueDate !== secondDueDate) return firstDueDate - secondDueDate;

    return (
      importanceRank[second.importance] -
      importanceRank[first.importance]
    );
  });
}

export default function AssignmentsPanel() {
  const [userId, setUserId] = useState<string | null>(null);
  const [classes, setClasses] = useState<AssignmentClassOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadAssignmentsPage() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("A signed-in user is required.");
        }

        const [assignmentData, classData] = await Promise.all([
          fetchAssignments(user.id),
          fetchClasses(user.id),
        ]);

        if (isCancelled) return;

        setUserId(user.id);
        setAssignments(assignmentData);
        setClasses(classData);
        setError(null);
      } catch (loadError: unknown) {
        if (isCancelled) return;
        console.error("Error loading assignments:", loadError);
        setError(
          "Assignments could not be loaded. Apply the assignments migration and try again."
        );
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void loadAssignmentsPage();

    return () => {
      isCancelled = true;
    };
  }, []);

  const sortedAssignments = useMemo(
    () => sortAssignments(assignments),
    [assignments]
  );

  async function handleAddAssignment(newAssignment: NewAssignment) {
    if (!userId) return;

    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("title", newAssignment.title);
      formData.append("description", newAssignment.description ?? "");
      formData.append("class_id", newAssignment.classId ?? "");
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
      const payload = await readCreateAssignmentResponse(response);

      if (!response.ok || !payload.assignment) {
        setError(payload.error ?? "Could not add this assignment.");
        return;
      }

      let materialsNotice = "";
      if (newAssignment.materials.length > 0) {
        try {
          const materialsFormData = new FormData();
          newAssignment.materials.forEach((file) =>
            materialsFormData.append("files", file),
          );
          const materialsResponse = await fetch(
            `/api/assignments/${payload.assignment.id}/materials`,
            { method: "POST", body: materialsFormData },
          );
          const materialsPayload = await readMaterialsResponse(materialsResponse);

          if (!materialsResponse.ok) {
            materialsNotice = ` The assignment was saved, but its study materials were not: ${materialsPayload.error ?? "upload failed"}`;
          } else {
            const materialCount = materialsPayload.materials?.length ?? 0;
            materialsNotice = ` ${materialCount} study material${materialCount === 1 ? "" : "s"} attached.`;
            if (materialsPayload.warnings?.length) {
              materialsNotice += ` ${materialsPayload.warnings.join(" ")}`;
            }
          }
        } catch {
          materialsNotice =
            " The assignment was saved, but its study materials could not be uploaded.";
        }
      }

      setAssignments((currentAssignments) => [
        ...currentAssignments,
        payload.assignment as Assignment,
      ]);
      setNotice(
        (typeof payload.warning === "string"
          ? payload.warning
          : newAssignment.file
            ? "Assignment and file saved."
            : "Assignment saved.") + materialsNotice,
      );
      setIsModalOpen(false);
    } catch (submitError) {
      console.error("Error adding assignment:", submitError);
      setError("Could not add this assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteAssignment(assignment: Assignment) {
    const confirmed = window.confirm(
      `Delete "${assignment.title}"? Any attached assignment file and study materials will also be deleted.`,
    );

    if (!confirmed) return;

    setDeletingAssignmentId(assignment.id);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        method: "DELETE",
      });
      const payload = await readErrorResponse(response);

      if (!response.ok) {
        setError(payload.error ?? "Could not delete this assignment.");
        return;
      }

      setAssignments((currentAssignments) =>
        currentAssignments.filter((item) => item.id !== assignment.id),
      );
      setNotice("Assignment deleted.");
    } catch (deleteError) {
      console.error("Error deleting assignment:", deleteError);
      setError("Could not delete this assignment. Please try again.");
    } finally {
      setDeletingAssignmentId(null);
    }
  }

  return (
    <>
      <main className="min-h-full bg-slate-50 px-5 py-8 text-slate-950 sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-8 flex items-start justify-between gap-5">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Assignments
              </h1>
              <p className="mt-2 text-[15px] text-slate-600">
                View everything that&apos;s due, organized by date
              </p>
            </div>

            <Button
              size="sm"
              className="mt-1"
              disabled={isLoading || !userId}
              onClick={() => setIsModalOpen(true)}
            >
              <Plus />
              <span className="hidden sm:inline">Add assignment</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </header>

          {error && !isModalOpen ? (
            <div
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          {notice ? (
            <div
              className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
              role="status"
            >
              {notice}
            </div>
          ) : null}

          <AssignmentList
            assignments={sortedAssignments}
            isLoading={isLoading}
            deletingAssignmentId={deletingAssignmentId}
            onDelete={handleDeleteAssignment}
          />
        </div>
      </main>

      <AssignmentModal
        key={isModalOpen ? "assignment-modal-open" : "assignment-modal-closed"}
        isOpen={isModalOpen}
        classes={classes}
        isSubmitting={isSubmitting}
        error={error}
        onClearError={() => setError(null)}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setError(null);
          }
        }}
        onSubmit={handleAddAssignment}
      />
    </>
  );
}

type CreateAssignmentResponse = {
  assignment?: Assignment;
  error?: string;
  warning?: string | null;
};

async function readCreateAssignmentResponse(
  response: Response,
): Promise<CreateAssignmentResponse> {
  try {
    return (await response.json()) as CreateAssignmentResponse;
  } catch {
    return {};
  }
}

async function readErrorResponse(response: Response) {
  try {
    return (await response.json()) as { error?: string };
  } catch {
    return {};
  }
}

async function readMaterialsResponse(response: Response) {
  try {
    return (await response.json()) as {
      materials?: Array<{ id: string }>;
      warnings?: string[];
      error?: string;
    };
  } catch {
    return {};
  }
}
