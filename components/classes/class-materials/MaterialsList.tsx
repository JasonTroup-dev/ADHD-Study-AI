import { BookOpen, FileText } from "lucide-react";

import type { ClassMaterial } from "./types";

export function MaterialsList({ materials }: { materials: ClassMaterial[] }) {
  if (materials.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-950">No materials uploaded yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Add assignment instructions, notes, readings, slides, or examples.
        </p>
      </div>
    );
  }

  return materials.map((material) => (
    <article key={material.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-950">{material.title}</h3>
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
  ));
}
