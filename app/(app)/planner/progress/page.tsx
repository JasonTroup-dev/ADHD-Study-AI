export const dynamic = "force-dynamic";

export default function ProgressPage() {
  return (
    <main className="min-h-full bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <header>
          <p className="text-sm font-semibold text-blue-700">Planner</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Progress
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Track completed study tasks and review your planner progress over
            time.
          </p>
        </header>

        <section className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-semibold">Progress view is ready</h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            This page is ready to be designed later.
          </p>
        </section>
      </div>
    </main>
  );
}