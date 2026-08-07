"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import type { AssignmentClassOption, NewAssignment } from "@/types/assignments";

import {
  analyzeClassMaterials,
  createAssignment,
  uploadAssignmentFile,
  uploadStudyMaterials,
} from "./api";
import type {
  ClassAssignmentOption,
  ClassMaterialsPanelProps,
  ConfirmationItem,
} from "./types";
import {
  deriveTitleFromFileName,
  toConfirmationItem,
  validateFiles,
} from "./validation";

type AssignmentResolution = {
  assignmentId: string;
  assignmentFileUploaded: boolean;
};

export function useClassMaterialsPanel({
  classId,
  className,
  assignments,
}: Omit<ClassMaterialsPanelProps, "materials">) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [assignmentOptions, setAssignmentOptions] = useState(assignments);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [confirmationItems, setConfirmationItems] = useState<ConfirmationItem[]>([]);
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
      const suggestions = await analyzeClassMaterials(classId, files);
      setSelectedFiles(files);
      setConfirmationItems(
        suggestions.map((suggestion) => toConfirmationItem(suggestion, files)),
      );
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
            markAssignmentFileUploaded(resolved.assignmentId);
          }
        } else {
          const payload = await uploadStudyMaterials(resolved.assignmentId, [file]);
          if (payload.warnings?.length) notices.push(payload.warnings.join(" "));
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

  async function resolveAssignmentForItem(
    item: ConfirmationItem,
    file: File,
  ): Promise<AssignmentResolution> {
    if (item.target === "existing_assignment") {
      if (!item.assignmentId) {
        throw new Error(`${item.originalFileName} needs an assignment.`);
      }
      return { assignmentId: item.assignmentId, assignmentFileUploaded: false };
    }

    const title = item.newAssignmentTitle?.trim() || deriveTitleFromFileName(file.name);
    const dueDate = item.dueDate?.trim();
    if (!dueDate) throw new Error(`${file.name} needs a due date before saving.`);

    const formData = buildAssignmentFormData({
      title,
      description: item.description.trim(),
      classId,
      dueDate,
      importance: "medium",
      points: null,
      file: item.kind === "assignment_file" ? file : null,
    });
    const payload = await createAssignment(formData);
    const createdAssignment = toClassAssignmentOption(payload.assignment);
    addAssignmentOption(createdAssignment);

    return {
      assignmentId: payload.assignment.id,
      assignmentFileUploaded: item.kind === "assignment_file",
    };
  }

  async function handleAddAssignment(newAssignment: NewAssignment) {
    setIsCreatingAssignment(true);
    setError(null);
    setNotice(null);

    try {
      const payload = await createAssignment(
        buildAssignmentFormData({
          title: newAssignment.title,
          description: newAssignment.description ?? "",
          classId,
          dueDate: newAssignment.dueDate,
          importance: newAssignment.importance,
          points: newAssignment.points,
          file: newAssignment.file,
        }),
      );

      let materialsNotice = "";
      if (newAssignment.materials.length > 0) {
        try {
          const materialsPayload = await uploadStudyMaterials(
            payload.assignment.id,
            newAssignment.materials,
          );
          materialsNotice = materialsPayload.warnings?.length
            ? ` ${materialsPayload.warnings.join(" ")}`
            : ` ${newAssignment.materials.length} study material${newAssignment.materials.length === 1 ? "" : "s"} attached.`;
        } catch {
          materialsNotice =
            " The assignment was saved, but its materials could not be uploaded.";
        }
      }

      addAssignmentOption(toClassAssignmentOption(payload.assignment));
      setNotice(`${payload.warning ?? "Assignment saved."}${materialsNotice}`);
      setIsAssignmentModalOpen(false);
      router.refresh();
    } catch (submitError) {
      console.error("Error adding class assignment:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not add this assignment. Please try again.",
      );
    } finally {
      setIsCreatingAssignment(false);
    }
  }

  function addAssignmentOption(assignment: ClassAssignmentOption) {
    setAssignmentOptions((current) =>
      current.some((item) => item.id === assignment.id)
        ? current
        : [...current, assignment],
    );
  }

  function markAssignmentFileUploaded(assignmentId: string) {
    setAssignmentOptions((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId
          ? { ...assignment, hasAssignmentFile: true }
          : assignment,
      ),
    );
  }

  return {
    assignmentClassOption,
    assignmentOptions,
    confirmationItems,
    error,
    fileInputRef,
    isAnalyzing,
    isAssignmentModalOpen,
    isConfirmOpen,
    isCreatingAssignment,
    isDragging,
    isSaving,
    notice,
    selectedFiles,
    analyzeFiles,
    clearError: () => setError(null),
    closeAssignmentModal: () => {
      if (!isCreatingAssignment) {
        setIsAssignmentModalOpen(false);
        setError(null);
      }
    },
    closeConfirmation: () => {
      if (!isSaving) {
        setIsConfirmOpen(false);
        setError(null);
      }
    },
    handleAddAssignment,
    handleConfirmUpload,
    handleFileChange,
    openAssignmentModal: () => setIsAssignmentModalOpen(true),
    setIsDragging,
    updateConfirmationItem,
  };
}

function buildAssignmentFormData({
  title,
  description,
  classId,
  dueDate,
  importance,
  points,
  file,
}: {
  title: string;
  description: string;
  classId: string;
  dueDate: string;
  importance: string;
  points: number | null;
  file: File | null;
}) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", description);
  formData.append("class_id", classId);
  formData.append("due_date", dueDate);
  formData.append("importance", importance);
  formData.append("points", points === null ? "" : String(points));
  if (file) formData.append("file", file);
  return formData;
}

function toClassAssignmentOption(
  assignment: NonNullable<
    Awaited<ReturnType<typeof createAssignment>>["assignment"]
  >,
): ClassAssignmentOption {
  return {
    id: assignment.id,
    title: assignment.title,
    dueDate: assignment.due_date,
    hasAssignmentFile: Boolean(assignment.original_file_name),
  };
}
