"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  getStudyGuidesSnapshot,
  parseStudyGuides,
  saveStudyGuides,
} from "./studyGuideStorage";

export default function StudyGuideLegacyImporter() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const guides = parseStudyGuides(getStudyGuidesSnapshot());
    if (guides.length === 0) return;

    async function importGuides() {
      const response = await fetch("/api/study-guides/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guides }),
      });

      if (!response.ok) return;

      saveStudyGuides([]);
      router.refresh();
    }

    void importGuides();
  }, [router]);

  return null;
}
