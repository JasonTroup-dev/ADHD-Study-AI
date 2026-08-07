"use client";

import { BookOpen, CheckCircle2, ChevronDown, CircleAlert, Clock3, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { classColorOptions, type ClassColor } from "@/lib/classColors";
import type { DetectedSyllabusCourse, SyllabusClassMatch } from "@/types/syllabus";

import type { ClassOption, ClassResolution } from "./types";

export const selectClassName =
  "h-9 w-full appearance-none rounded-md border border-input bg-white px-3 pr-9 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-[3px] focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export function CourseSetupCard({
  course,
  classMatch,
  classes,
  classResolution,
  selectedClassId,
  newClassName,
  newClassCode,
  newClassInstructor,
  newClassColor,
  maxTasksPerDay,
  isBusy,
  onClassResolutionChange,
  onSelectedClassChange,
  onNewClassNameChange,
  onNewClassCodeChange,
  onNewClassInstructorChange,
  onNewClassColorChange,
  onMaxTasksPerDayChange,
}: {
  course: DetectedSyllabusCourse | null;
  classMatch: SyllabusClassMatch | null;
  classes: ClassOption[];
  classResolution: ClassResolution;
  selectedClassId: string;
  newClassName: string;
  newClassCode: string;
  newClassInstructor: string;
  newClassColor: ClassColor;
  maxTasksPerDay: number;
  isBusy: boolean;
  onClassResolutionChange: (resolution: ClassResolution) => void;
  onSelectedClassChange: (value: string) => void;
  onNewClassNameChange: (value: string) => void;
  onNewClassCodeChange: (value: string) => void;
  onNewClassInstructorChange: (value: string) => void;
  onNewClassColorChange: (value: ClassColor) => void;
  onMaxTasksPerDayChange: (value: number) => void;
}) {
  const detectedLabel =
    [course?.classCode, course?.name].filter(Boolean).join(" — ") || "Unknown course";

  return (
    <aside className="space-y-4 lg:sticky lg:top-0">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            <BookOpen className="size-3.5" aria-hidden="true" />
            Course
          </div>
          <h3 className="mt-3 text-base font-semibold leading-snug text-slate-950">{detectedLabel}</h3>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span>{course?.instructor || "Instructor not found"}</span>
            <span aria-hidden="true">·</span>
            <span>{Math.round((course?.confidence ?? 0) * 100)}% confidence</span>
          </div>
        </div>
        <div className="p-4">
          {classMatch && classResolution === "matched" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900">Matched to your class</p>
                  <p className="mt-1 text-sm text-emerald-800">{classMatch.name}</p>
                </div>
              </div>
              <button type="button" className="mt-3 text-xs font-semibold text-emerald-800 underline underline-offset-2" onClick={() => onClassResolutionChange("existing")} disabled={isBusy}>
                Use a different class
              </button>
            </div>
          ) : null}

          {!classMatch && classResolution === null ? (
            <div>
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
                <p className="text-xs leading-5 text-amber-900">We couldn&apos;t match this syllabus to one of your classes.</p>
              </div>
              <div className="mt-3 grid gap-2">
                <Button type="button" size="sm" onClick={() => onClassResolutionChange("create")}>Create detected class</Button>
                <Button type="button" size="sm" variant="outline" disabled={classes.length === 0} onClick={() => onClassResolutionChange("existing")}>Choose existing class</Button>
              </div>
            </div>
          ) : null}

          {classResolution === "existing" ? (
            <div>
              <Label htmlFor="study-plan-existing-class" className="text-xs text-slate-600">Use an existing class</Label>
              <div className="relative mt-2">
                <select id="study-plan-existing-class" value={selectedClassId} disabled={isBusy} onChange={(event) => onSelectedClassChange(event.target.value)} className={selectClassName}>
                  <option value="">Choose a class</option>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              </div>
              <button type="button" className="mt-3 text-xs font-semibold text-slate-600 underline underline-offset-2" disabled={isBusy} onClick={() => onClassResolutionChange("create")}>
                Create a new class instead
              </button>
            </div>
          ) : null}

          {classResolution === "create" ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="detected-class-name" className="text-xs text-slate-600">Class name</Label>
                <Input id="detected-class-name" value={newClassName} disabled={isBusy} onChange={(event) => onNewClassNameChange(event.target.value)} className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="detected-class-code" className="text-xs text-slate-600">Course code</Label>
                  <Input id="detected-class-code" value={newClassCode} disabled={isBusy} onChange={(event) => onNewClassCodeChange(event.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="detected-class-instructor" className="text-xs text-slate-600">Instructor</Label>
                  <Input id="detected-class-instructor" value={newClassInstructor} disabled={isBusy} onChange={(event) => onNewClassInstructorChange(event.target.value)} className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label id="detected-class-color-label" className="text-xs text-slate-600">Color</Label>
                <div role="radiogroup" aria-labelledby="detected-class-color-label" className="mt-2 flex flex-wrap gap-2">
                  {classColorOptions.map((color) => (
                    <button key={color.value} type="button" role="radio" aria-checked={newClassColor === color.value} aria-label={color.name} disabled={isBusy} onClick={() => onNewClassColorChange(color.value)} className={`flex size-7 items-center justify-center rounded-full transition disabled:opacity-50 ${newClassColor === color.value ? "ring-2 ring-slate-900 ring-offset-2" : "hover:scale-110"}`}>
                      <span className={`size-5 rounded-full ${color.accent}`} />
                    </button>
                  ))}
                </div>
              </div>
              {classes.length > 0 ? (
                <button type="button" className="text-xs font-semibold text-slate-600 underline underline-offset-2" onClick={() => onClassResolutionChange("existing")}>Use an existing class</button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" /> Workload
        </div>
        <Label htmlFor="study-plan-daily-limit" className="mt-4 text-xs text-slate-600">Maximum study blocks per day</Label>
        <div className="relative mt-2">
          <select id="study-plan-daily-limit" value={maxTasksPerDay} disabled={isBusy} onChange={(event) => onMaxTasksPerDayChange(Number(event.target.value))} className={selectClassName}>
            {[1, 2, 3, 4, 5].map((limit) => <option key={limit} value={limit}>{limit} {limit === 1 ? "block" : "blocks"} per day</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          We&apos;ll spread work across available days and never exceed this limit.
        </div>
      </section>
    </aside>
  );
}
