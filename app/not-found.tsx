import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-gray-100 px-6 py-10 text-gray-950">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <Compass className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-semibold text-blue-700">404 · Page not found</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">That page wandered off</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          The link may be outdated, but your study space is still right where you left it.
        </p>
        <Button asChild className="mt-7">
          <Link href="/dashboard"><ArrowLeft aria-hidden="true" /> Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
