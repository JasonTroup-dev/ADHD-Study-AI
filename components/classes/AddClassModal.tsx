"use client";

import { type FormEvent, useState } from "react";
import { Check, FileUp, GraduationCap, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { classColorOptions, type ClassColor } from "@/lib/classColors";
import { cn } from "@/lib/utils";
import type { CreateClassInput } from "@/types/classes";

type AddClassModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateClass: (newClass: CreateClassInput) => Promise<void>;
  onUploadSyllabus: () => void;
};

export default function AddClassModal({
  isOpen,
  onClose,
  onCreateClass,
  onUploadSyllabus,
}: AddClassModalProps) {
  const [className, setClassName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [instructor, setInstructor] = useState("");
  const [classColor, setClassColor] = useState<ClassColor>("blue");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isClassNameMissing = hasSubmitted && !className.trim();
  const isCourseCodeMissing = hasSubmitted && !courseCode.trim();
  const isInstructorMissing = hasSubmitted && !instructor.trim();

  function resetForm() {
    setClassName("");
    setCourseCode("");
    setInstructor("");
    setClassColor("blue");
    setHasSubmitted(false);
    setErrorMessage(null);
  }

  function handleClose() {
    if (isSubmitting) return;
    resetForm();
    onClose();
  }

  function handleSyllabusUpload() {
    if (isSubmitting) return;
    resetForm();
    onClose();
    onUploadSyllabus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);

    const trimmedClassName = className.trim();
    const trimmedCourseCode = courseCode.trim();
    const trimmedInstructor = instructor.trim();

    if (!trimmedClassName || !trimmedCourseCode || !trimmedInstructor) {
      setErrorMessage("Complete the required fields to create your class.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onCreateClass({
        name: trimmedClassName,
        classCode: trimmedCourseCode,
        professorName: trimmedInstructor,
        color: classColor,
      });
      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The class could not be created.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] max-w-xl gap-0 overflow-y-auto p-0"
      >
        <div className="relative border-b border-slate-200 bg-slate-50 px-6 py-5 pr-14">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <GraduationCap className="size-5" aria-hidden="true" />
            </span>
            <div>
              <DialogTitle className="text-xl text-slate-950">
                Add a class
              </DialogTitle>
              <DialogDescription className="mt-1.5 leading-5 text-slate-600">
                Create one place for assignments, materials, flashcards, and
                study sessions.
              </DialogDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close add class dialog"
            className="absolute right-4 top-4 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-950"
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        <form noValidate onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-5 px-6 py-6">
            <section className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <FileUp className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    Start from your syllabus
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Upload a PDF or DOCX to detect the class and review its
                    assignments before saving.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleSyllabusUpload}
                disabled={isSubmitting}
                className="h-9 shrink-0 rounded-lg border-blue-200 bg-white px-3 text-blue-800 hover:bg-blue-100"
              >
                Upload syllabus
              </Button>
            </section>

            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Or enter manually
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-name">Class name</Label>
              <Input
                id="class-name"
                value={className}
                onChange={(event) => {
                  setClassName(event.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Organic Chemistry"
                autoComplete="off"
                autoFocus
                required
                disabled={isSubmitting}
                aria-invalid={isClassNameMissing}
                aria-describedby={
                  isClassNameMissing ? "class-name-error" : undefined
                }
                className="h-11 rounded-lg bg-white"
              />
              {isClassNameMissing ? (
                <p id="class-name-error" className="text-xs text-red-600">
                  Enter a class name.
                </p>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="course-code">Course code</Label>
                <Input
                  id="course-code"
                  value={courseCode}
                  onChange={(event) => {
                    setCourseCode(event.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="CHEM 3331"
                  autoComplete="off"
                  required
                  disabled={isSubmitting}
                  aria-invalid={isCourseCodeMissing}
                  aria-describedby={
                    isCourseCodeMissing ? "course-code-error" : undefined
                  }
                  className="h-11 rounded-lg bg-white"
                />
                {isCourseCodeMissing ? (
                  <p id="course-code-error" className="text-xs text-red-600">
                    Enter a course code.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="class-instructor">Instructor</Label>
                <Input
                  id="class-instructor"
                  value={instructor}
                  onChange={(event) => {
                    setInstructor(event.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Dr. Smith"
                  autoComplete="off"
                  required
                  disabled={isSubmitting}
                  aria-invalid={isInstructorMissing}
                  aria-describedby={
                    isInstructorMissing ? "instructor-error" : undefined
                  }
                  className="h-11 rounded-lg bg-white"
                />
                {isInstructorMissing ? (
                  <p id="instructor-error" className="text-xs text-red-600">
                    Enter an instructor.
                  </p>
                ) : null}
              </div>
            </div>

            <fieldset disabled={isSubmitting}>
              <legend className="text-sm font-medium text-slate-950">
                Class color
              </legend>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                This color identifies the class across your workspace.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {classColorOptions.map((color) => {
                  const isSelected = classColor === color.value;

                  return (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        setClassColor(color.value);
                        setErrorMessage(null);
                      }}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
                        isSelected
                          ? "border-slate-950 bg-slate-50 text-slate-950"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <span
                        className={cn("size-3.5 rounded-full", color.accent)}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-left">
                        {color.name}
                      </span>
                      {isSelected ? (
                        <Check className="size-4 shrink-0" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {errorMessage ? (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                role="alert"
              >
                {errorMessage}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-10 rounded-lg bg-white px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-lg bg-slate-950 px-5 text-white hover:bg-slate-800"
            >
              {isSubmitting ? "Creating class..." : "Create class"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
