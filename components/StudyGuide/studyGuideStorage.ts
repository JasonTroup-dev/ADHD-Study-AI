import type { GeneratedStudyGuide, SavedStudyGuide } from "./types";

const STORAGE_KEY = "adhd-study-ai:study-guides:v1";
const STORAGE_EVENT = "adhd-study-ai:study-guides-updated";
const MAX_SAVED_GUIDES = 20;
const EMPTY_SNAPSHOT = "[]";

export function subscribeToStudyGuides(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
  };
}

export function getStudyGuidesSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY_SNAPSHOT;
}

export function getServerStudyGuidesSnapshot() {
  return EMPTY_SNAPSHOT;
}

export function parseStudyGuides(snapshot: string): SavedStudyGuide[] {
  try {
    const value: unknown = JSON.parse(snapshot);

    if (!Array.isArray(value)) return [];

    return value.filter(isSavedStudyGuide).slice(0, MAX_SAVED_GUIDES);
  } catch {
    return [];
  }
}

export function createSavedStudyGuide(
  guide: GeneratedStudyGuide,
): SavedStudyGuide {
  return {
    ...guide,
    id: window.crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

export function saveStudyGuides(guides: SavedStudyGuide[]) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(guides.slice(0, MAX_SAVED_GUIDES)),
    );
    window.dispatchEvent(new Event(STORAGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

function isSavedStudyGuide(value: unknown): value is SavedStudyGuide {
  if (!value || typeof value !== "object") return false;

  const guide = value as Partial<SavedStudyGuide>;

  return (
    typeof guide.id === "string" &&
    typeof guide.title === "string" &&
    typeof guide.content === "string" &&
    typeof guide.originalFileName === "string" &&
    typeof guide.createdAt === "string"
  );
}
