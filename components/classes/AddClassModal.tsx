"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { classColorOptions, type ClassColor } from "@/lib/classColors";

type AddClassModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateClass: (newClass: {
    name: string;
    classCode: string;
    professorName: string;
    color: ClassColor;
  }) => void;
};

export default function AddClassModal({
  isOpen,
  onClose,
  onCreateClass,
}: AddClassModalProps) {
  const [className, setClassName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [instructor, setInstructor] = useState("");
  const [classColor, setClassColor] = useState<ClassColor>("blue");

  if (!isOpen) return null;

  function handleSubmit() {
    const trimmedClassName = className.trim();
    const trimmedCourseCode = courseCode.trim();
    const trimmedInstructor = instructor.trim();

    if (!trimmedClassName || !trimmedCourseCode || !trimmedInstructor) return;

    onCreateClass({
      name: trimmedClassName,
      classCode: trimmedCourseCode,
      professorName: trimmedInstructor,
      color: classColor,
    });

    setClassName("");
    setCourseCode("");
    setInstructor("");
    setClassColor("blue");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold">Create New Class</h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900"
          >
            ✕
          </button>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium">Class Name</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="e.g., Organic Chemistry"
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">Course Code</label>
          <input
            type="text"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="e.g., CHEM 3331"
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">Instructor</label>
          <input
            type="text"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="e.g., Dr. Smith"
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">Class Color</label>

          <div className="mt-3 flex items-center gap-3">
            {classColorOptions.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setClassColor(color.value)}
                aria-label={`Choose ${color.name}`}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                  classColor === color.value
                    ? "ring-2 ring-gray-900 ring-offset-2"
                    : "hover:scale-105"
                }`}
              >
                <span className={`h-6 w-6 rounded-full ${color.accent}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" className="mr-2 border" onClick={onClose}>
            Cancel
          </Button>

          <Button onClick={handleSubmit}>Create Class</Button>
        </div>
      </div>
    </div>
  );
}