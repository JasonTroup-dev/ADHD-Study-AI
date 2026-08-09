import type { Metadata } from "next";

import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sample Workspace | ADHD Study AI",
  description:
    "Explore a read-only ADHD Study AI workspace with sample classes, tasks, deadlines, and no-cost tutor interactions.",
};

export default function DemoPage() {
  redirect("/dashboard?demo=1");
}
