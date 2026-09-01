import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#f7f3ea] px-6 py-10 text-[#19241f]">
      <div aria-hidden="true" className="absolute -right-16 top-20 size-48 rounded-full bg-[#ed9b79]/45" />
      <div aria-hidden="true" className="absolute -bottom-20 -left-12 size-56 rounded-full bg-[#ddc56f]/45" />
      <div className="relative w-full max-w-lg rounded-[2rem] border border-[#19241f]/10 bg-[#fffdf8] p-8 text-center shadow-[0_32px_80px_-46px_rgba(25,36,31,0.65)] sm:p-12">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#e5eddf] text-[#4d765f]">
          <Compass className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#9e3f28]">404 · Page not found</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">That page wandered off</h1>
        <p className="mt-3 text-sm leading-6 text-[#66736c]">
          The link may be outdated, but your study space is still right where you left it.
        </p>
        <Button asChild className="mt-7">
          <Link href="/dashboard"><ArrowLeft aria-hidden="true" /> Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
