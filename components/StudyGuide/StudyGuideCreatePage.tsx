"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import StudyMaterialUploadModal from "./StudyMaterialUploadModal";

export default function StudyGuideCreatePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <StudyMaterialUploadModal
      isOpen
      isLoading={isLoading}
      error={error}
      displayMode="page"
      onClose={() => router.push("/study/study-guide")}
      onCreateStudyGuide={(guide) => {
        router.push(`/study/study-guide/${guide.id}`);
      }}
      onLoadingChange={setIsLoading}
      onError={setError}
    />
  );
}
