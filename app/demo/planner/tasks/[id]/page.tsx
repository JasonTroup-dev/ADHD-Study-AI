import { notFound } from "next/navigation";

import { TaskDetailsView } from "@/components/tasks/TaskDetailsView";
import { getDemoTaskDetailsData } from "@/lib/demo/readOnlyWorkspace";

type DemoTaskDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

const demoReturnDestinations = {
  calendar: { href: "/demo/calendar", label: "calendar" },
  dashboard: { href: "/demo", label: "dashboard" },
  planner: { href: "/demo/planner", label: "planner" },
} as const;

export default async function DemoTaskDetailsPage({
  params,
  searchParams,
}: DemoTaskDetailsPageProps) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const task = getDemoTaskDetailsData(id);
  if (!task) notFound();

  const returnDestination = getDemoReturnDestination(from);

  return (
    <TaskDetailsView
      task={task}
      returnHref={returnDestination.href}
      returnLabel={returnDestination.label}
      readOnly
    />
  );
}

function getDemoReturnDestination(from: string | string[] | undefined) {
  const origin = Array.isArray(from) ? from[0] : from;

  if (origin && origin in demoReturnDestinations) {
    return demoReturnDestinations[
      origin as keyof typeof demoReturnDestinations
    ];
  }

  return demoReturnDestinations.planner;
}
