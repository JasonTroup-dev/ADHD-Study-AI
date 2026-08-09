import AiTutorClient from "@/app/(app)/study/ai-tutor/AiTutorClient";

export default function DemoAiTutorPage() {
  return (
    <div className="h-full overflow-hidden" inert aria-disabled="true">
      <AiTutorClient />
    </div>
  );
}
