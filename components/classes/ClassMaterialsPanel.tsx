"use client";

import { Plus } from "lucide-react";

import AssignmentModal from "@/components/assignments/AssignmentModal";
import { Button } from "@/components/ui/button";

import { AnalysisConfirmationModal } from "./class-materials/AnalysisConfirmationModal";
import { MaterialsDropzone } from "./class-materials/MaterialsDropzone";
import { MaterialsList } from "./class-materials/MaterialsList";
import type {
  ClassAssignmentOption,
  ClassMaterial,
  ClassMaterialsPanelProps,
} from "./class-materials/types";
import { useClassMaterialsPanel } from "./class-materials/useClassMaterialsPanel";

export type { ClassAssignmentOption, ClassMaterial };

export default function ClassMaterialsPanel({
  classId,
  className,
  assignments,
  materials,
}: ClassMaterialsPanelProps) {
  const workflow = useClassMaterialsPanel({ classId, className, assignments });

  return (
    <div id="materials">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-slate-950">Notes &amp; Materials</h2>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
          onClick={workflow.openAssignmentModal}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Assignment
        </Button>
      </div>

      <MaterialsDropzone
        fileInputRef={workflow.fileInputRef}
        isDragging={workflow.isDragging}
        isAnalyzing={workflow.isAnalyzing}
        isSaving={workflow.isSaving}
        onDraggingChange={workflow.setIsDragging}
        onFileChange={workflow.handleFileChange}
        onFilesDropped={(files) => void workflow.analyzeFiles(files)}
      />

      {workflow.error && !workflow.isConfirmOpen ? (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {workflow.error}
        </p>
      ) : null}
      {workflow.notice ? (
        <p className="mt-3 text-sm font-medium text-blue-700" role="status">
          {workflow.notice}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <MaterialsList materials={materials} />
      </div>

      <AnalysisConfirmationModal
        isOpen={workflow.isConfirmOpen}
        items={workflow.confirmationItems}
        files={workflow.selectedFiles}
        assignments={workflow.assignmentOptions}
        error={workflow.error}
        isSaving={workflow.isSaving}
        onClose={workflow.closeConfirmation}
        onItemChange={workflow.updateConfirmationItem}
        onSubmit={workflow.handleConfirmUpload}
      />

      <AssignmentModal
        key={workflow.isAssignmentModalOpen ? "class-assignment-open" : "class-assignment-closed"}
        isOpen={workflow.isAssignmentModalOpen}
        classes={[workflow.assignmentClassOption]}
        defaultClassId={classId}
        allowNoClass={false}
        isSubmitting={workflow.isCreatingAssignment}
        error={workflow.error}
        onClearError={workflow.clearError}
        onClose={workflow.closeAssignmentModal}
        onSubmit={workflow.handleAddAssignment}
      />
    </div>
  );
}
