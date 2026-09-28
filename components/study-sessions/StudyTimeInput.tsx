"use client";

import { useId } from "react";
import { MAX_STUDY_MINUTES } from "@/lib/studyTime";

export function StudyTimeInput({ value, onChange, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-800">Study minutes <span className="font-normal text-gray-500">(optional)</span></label>
      <div className="flex flex-wrap items-center gap-2">
        <input id={id} type="number" inputMode="numeric" min={0} max={MAX_STUDY_MINUTES} step={1}
          value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}
          placeholder="Minutes" aria-describedby={`${id}-help`}
          className="h-9 w-28 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
        {[15, 25, 45].map((minutes) => (
          <button key={minutes} type="button" disabled={disabled} aria-pressed={value === String(minutes)}
            onClick={() => onChange(String(minutes))}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 aria-pressed:border-blue-500 aria-pressed:bg-blue-50 disabled:opacity-50">
            {minutes} min
          </button>
        ))}
      </div>
      <p id={`${id}-help`} className="text-xs leading-5 text-gray-500">Include only time you studied. Leave blank if unsure; your completed work still counts.</p>
    </div>
  );
}
