import { ClassWorkspaceView } from "@/components/classes/ClassWorkspaceView";
import { getClassWorkspaceData } from "@/lib/classes/classWorkspace";

type PageProps = {
  params: Promise<{ classId: string }>;
};

export default async function ClassPage({ params }: PageProps) {
  const { classId } = await params;
  const workspace = await getClassWorkspaceData(classId);
  return <ClassWorkspaceView classId={classId} workspace={workspace} />;
}
