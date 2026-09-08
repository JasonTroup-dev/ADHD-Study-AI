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
      <div className="w-full max-w-lg rounded-[2rem] border border-[#19241f]/10 bg-[#fffdf8] p-6 text-center shadow-[0_32px_80px_-46px_rgba(25,36,31,0.65)] sm:p-10">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#f3d7c9] text-[#9e3f28]">
          <CircleAlert className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">This page hit a snag</h1>
        <p className="mt-2 text-sm leading-6 text-[#66736c]">
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
