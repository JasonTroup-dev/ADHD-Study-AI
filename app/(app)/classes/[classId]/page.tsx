import { ChevronRight, Plus, Upload } from "lucide-react";
import Link from "next/link";

import { ClassAssignmentsSection } from "@/components/classes/class-workspace/ClassAssignmentsSection";
import { ClassFlashcardsSection } from "@/components/classes/class-workspace/ClassFlashcardsSection";
import { ClassNextUpCard } from "@/components/classes/class-workspace/ClassNextUpCard";
import { ClassWorkspaceSidebar } from "@/components/classes/class-workspace/ClassWorkspaceSidebar";
import ClassMaterialsPanel from "@/components/classes/ClassMaterialsPanel";
import DeleteClassButton from "@/components/classes/DeleteClassButton";
import { Button } from "@/components/ui/button";
import {
  getClassWorkspaceData,
  getNextUp,
  getQuickActions,
} from "@/lib/classes/classWorkspace";

type PageProps = {
  params: Promise<{ classId: string }>;
};

export default async function ClassPage({ params }: PageProps) {
  const { classId } = await params;
  const workspace = await getClassWorkspaceData(classId);
  const quickActions = getQuickActions(classId);
  const nextUp = getNextUp({
    classId,
    classColor: workspace.course.color,
    activeSession: workspace.activeSession,
    plannerTasks: workspace.plannerTasks,
    assignments: workspace.assignmentSummaries,
    flashcardSets: workspace.flashcardSets,
    materialCount: workspace.materialCount,
  });

  return (
    <main className="min-h-full w-full bg-[#f7f8fb] text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">
        <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-2 text-sm text-slate-500">
              <Link href="/classes" className="transition hover:text-slate-900">Classes</Link>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium text-slate-900">{workspace.course.name}</span>
            </nav>
            <h1 className="text-3xl font-semibold tracking-normal text-slate-950">{workspace.course.name}</h1>
            <p className="mt-2 text-base text-slate-600">
              {workspace.course.code}<span className="mx-2 text-slate-300">-</span>{workspace.course.instructor}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50">
              <Link href="#materials"><Upload className="h-4 w-4" aria-hidden="true" />Upload Material</Link>
            </Button>
            <Button asChild className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-none hover:bg-slate-800">
              <Link href="#materials"><Plus className="h-4 w-4" aria-hidden="true" />Add Assignment</Link>
            </Button>
          </div>
        </header>

        <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="space-y-7">
            <ClassNextUpCard nextUp={nextUp} />
            <ClassAssignmentsSection classId={classId} classColor={workspace.course.color} assignments={workspace.assignmentSummaries} />
            <ClassMaterialsPanel classId={classId} className={workspace.course.name} assignments={workspace.assignments} materials={workspace.materials} />
            <ClassFlashcardsSection classId={classId} flashcardSets={workspace.flashcardSets} />
          </section>
          <ClassWorkspaceSidebar
            courseProgress={workspace.courseProgress}
            materialCount={workspace.materialCount}
            weekItems={workspace.weekItems}
            quickActions={quickActions}
          />
        </div>

        <section className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Delete this class</h2>
            <p className="mt-1 text-sm text-slate-600">Permanently remove this class and all of its study data.</p>
          </div>
          <DeleteClassButton classId={classId} className={workspace.course.name} />
        </section>
      </div>
    </main>
  );
}
