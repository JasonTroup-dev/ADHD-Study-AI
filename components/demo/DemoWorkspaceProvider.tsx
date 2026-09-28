"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { FlashcardSetEditorInitialSet } from "@/components/flashcard/FlashcardSetEditor";
import {
  demoFlashcardSets,
  type DemoFlashcardSet,
} from "@/lib/demo/flashcards";

import {
  demoCalendarItems,
  demoClasses,
  demoDashboardData,
  demoDate,
  demoTasks,
} from "@/lib/demo/readOnlyWorkspace";

const staticDemoWorkspaceValue = {
  calendarItems: demoCalendarItems,
  classes: demoClasses,
  dashboardData: demoDashboardData,
  date: demoDate,
  readOnly: true as const,
  tasks: demoTasks,
};

type DemoWorkspaceValue = typeof staticDemoWorkspaceValue & {
  flashcardSets: DemoFlashcardSet[];
  updateFlashcardSet: (set: FlashcardSetEditorInitialSet) => void;
};

const DemoWorkspaceContext = createContext<DemoWorkspaceValue | null>(null);

export function DemoWorkspaceProvider({ children }: { children: ReactNode }) {
  const [flashcardSets, setFlashcardSets] = useState<DemoFlashcardSet[]>(
    () => demoFlashcardSets,
  );
  const updateFlashcardSet = useCallback((updatedSet: FlashcardSetEditorInitialSet) => {
    setFlashcardSets((currentSets) =>
      currentSets.map((currentSet) =>
        currentSet.id === updatedSet.id
          ? { ...currentSet, ...updatedSet }
          : currentSet,
      ),
    );
  }, []);
  const value = useMemo(
    () => ({
      ...staticDemoWorkspaceValue,
      flashcardSets,
      updateFlashcardSet,
    }),
    [flashcardSets, updateFlashcardSet],
  );

  return (
    <DemoWorkspaceContext.Provider value={value}>
      {children}
    </DemoWorkspaceContext.Provider>
  );
}

export function useDemoWorkspace() {
  return useContext(DemoWorkspaceContext);
}
