"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { notifyClassesChanged } from "@/lib/classEvents";
import ClassCard from "@/components/classes/ClassCard";
import AddClassModal from "@/components/classes/AddClassModal";
import StudyPlannerModal from "@/components/StudyPlanner/StudyPlannerModal";
import type { ClassSummary, CreateClassInput } from "@/types/classes";
import type { StudyPlanImportSummary } from "@/types/syllabus";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function fetchClasses() {
    const response = await fetch("/api/classes", { cache: "no-store" });
    const payload = await readJson(response);

    if (!response.ok) {
      throw new Error(
        getErrorMessage(payload, "Your classes could not be loaded."),
      );
    }

    setClasses(getClasses(payload));
  }

  async function handleAddClass(newClass: CreateClassInput) {
    const response = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClass),
    });
    const payload = await readJson(response);

    if (!response.ok) {
      throw new Error(
        getErrorMessage(payload, "The class could not be created."),
      );
    }

    const createdClass = getCreatedClass(payload);
    setClasses((current) => [...current, createdClass]);
    setIsModalOpen(false);
    notifyClassesChanged();
  }

  function handleSyllabusImport(summary: StudyPlanImportSummary) {
    setSuccessMessage(
      `Imported ${summary.assignmentCount} assignment${
        summary.assignmentCount === 1 ? "" : "s"
      } from the syllabus into ${summary.className}.`,
    );

    void fetchClasses().catch((error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Your updated classes could not be loaded.",
      );
    });
  }

  useEffect(() => {
    async function loadPage() {
      try {
        await fetchClasses();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Your classes could not be loaded.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPage();
  }, []);


  return (
    <div className="min-h-screen w-full bg-gray-100">
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-8 lg:px-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-semibold">Classes</h1>
            <p className="text-xl py-2 text-gray-600">Organize your courses, notes, flashcards, and study sessions</p>
          </div>

          <div className="pt-2">
            <Button 
              variant="default" 
              size="default"
              onClick={() => setIsModalOpen(true)}
              >
                  + Add Class
            </Button>
          </div>

        </div>

        {successMessage ? (
          <div
            className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            role="status"
          >
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="font-semibold text-emerald-900 hover:text-emerald-700"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {isLoading ? (
            <p className="text-sm text-gray-600 lg:col-span-12">
              Loading your classes...
            </p>
          ) : null}

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 lg:col-span-12">
              {errorMessage}
            </div>
          ) : null}

          {!isLoading && !errorMessage && classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center lg:col-span-12">
              <h2 className="text-lg font-semibold">Add your first class</h2>
              <p className="mt-2 text-sm text-gray-600">
                Keep assignments, notes, flashcards, and study sessions
                together.
              </p>
            </div>
          ) : null}

          {classes.map((classItem) => (
            <ClassCard
              key={classItem.id}
              id={classItem.id}
              name={classItem.name}
              classCode={classItem.classCode}
              professorName={classItem.professorName}
              color={classItem.color}
              nextAssignment={classItem.nextAssignment}
              progressPercent={classItem.progressPercent}
              flashcardSetCount={classItem.flashcardSetCount}
              noteCount={classItem.noteCount}
              sessionCount={classItem.sessionCount}
            />
          ))}
        </div>
      </div>


      <AddClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateClass={handleAddClass}
        onUploadSyllabus={() => setIsSyllabusModalOpen(true)}
      />

      <StudyPlannerModal
        isOpen={isSyllabusModalOpen}
        classes={classes.map((classItem) => ({
          id: classItem.id,
          name: classItem.name,
        }))}
        onClose={() => setIsSyllabusModalOpen(false)}
        onStudyPlanCreated={handleSyllabusImport}
      />
                
    </div>
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getClasses(payload: unknown): ClassSummary[] {
  if (!isRecord(payload) || !Array.isArray(payload.classes)) return [];
  return payload.classes as ClassSummary[];
}

function getCreatedClass(payload: unknown): ClassSummary {
  if (isRecord(payload) && isRecord(payload.class)) {
    return payload.class as ClassSummary;
  }

  throw new Error("The class was created, but its details could not be loaded.");
}

function getErrorMessage(payload: unknown, fallback: string) {
  return isRecord(payload) && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
