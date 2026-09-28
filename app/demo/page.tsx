import type { Metadata } from "next";

import DashboardClient from "@/app/(app)/dashboard/DashboardClient";
import { demoDashboardData } from "@/lib/demo/readOnlyWorkspace";

export const metadata: Metadata = {
  title: "Sample Workspace | ADHD Study AI",
  description:
    "Explore a read-only ADHD Study AI workspace with sample classes, tasks, deadlines, and no-cost tutor interactions.",
};

export default function DemoPage() {
  return <DashboardClient initialData={demoDashboardData} readOnly />;
}
