import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PracticeQuizMaterialPicker from "@/components/StudyTools/PracticeQuizMaterialPicker";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create a Practice Quiz | ADHD Study AI",
  description: "Turn any study material into a focused, saved practice quiz.",
};

export default async function CreatePracticeQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId = "" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  const initialClassId = (classes ?? []).some((item) => item.id === classId)
    ? classId
    : "";

  return (
    <PracticeQuizMaterialPicker
      classes={classes ?? []}
      initialClassId={initialClassId}
    />
  );
}
