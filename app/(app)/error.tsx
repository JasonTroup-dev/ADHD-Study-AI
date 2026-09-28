"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert, Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/monitoring/client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError("error-boundary", error);
  }, [error]);

  return (
    <div className="page-shell flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <CircleAlert className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">This page hit a snag</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Your work is still safe. Try loading this view again, or return to the dashboard.
        </p>
        {error.digest ? <p className="mt-3 font-mono text-xs text-gray-400">Reference: {error.digest}</p> : null}
        <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/dashboard"><Home aria-hidden="true" /> Dashboard</Link>
          </Button>
          <Button type="button" onClick={reset}>
            <RefreshCw aria-hidden="true" /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
