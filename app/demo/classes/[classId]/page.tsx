import { notFound } from "next/navigation";

import { ClassWorkspaceView } from "@/components/classes/ClassWorkspaceView";
import { getDemoClassWorkspaceData } from "@/lib/demo/readOnlyWorkspace";

export default async function DemoClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const workspace = getDemoClassWorkspaceData(classId);
  if (!workspace) notFound();

  return (
    <ClassWorkspaceView
      classId={classId}
      workspace={workspace}
      readOnly
      classesHref="/demo/classes"
    />
  );
}
