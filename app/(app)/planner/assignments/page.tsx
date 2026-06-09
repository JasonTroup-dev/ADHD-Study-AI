export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { CalendarCheck2, ClipboardList } from "lucide-react";
import Link from "next/link";

export default function AssignmentsPage() {
  return (
    <main className="min-h-full bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <header>
          <p className="text-sm font-semibold text-blue-700">Planner</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Assignments
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review scheduled work and manage upcoming study tasks from your
            planner.
          </p>
        </header>

        <section className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <ClipboardList className="h-7 w-7" aria-hidden="true" />
          </div>

          <h2 className="mt-5 text-xl font-semibold">
            Assignment view is ready
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Use the planner to add tasks, choose due dates, and track what you
            have completed.
          </p>

          <Button asChild className="mt-6">
            <Link href="/planner">
              <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
              Open planner
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}