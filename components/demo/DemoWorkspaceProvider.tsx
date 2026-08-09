"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  demoCalendarItems,
  demoClasses,
  demoDashboardData,
  demoDate,
  demoTasks,
} from "@/lib/demo/readOnlyWorkspace";

const demoWorkspaceValue = {
  calendarItems: demoCalendarItems,
  classes: demoClasses,
  dashboardData: demoDashboardData,
  date: demoDate,
  readOnly: true as const,
  tasks: demoTasks,
};

type DemoWorkspaceValue = typeof demoWorkspaceValue;

const DemoWorkspaceContext = createContext<DemoWorkspaceValue | null>(null);

export function DemoWorkspaceProvider({ children }: { children: ReactNode }) {
  return (
    <DemoWorkspaceContext.Provider value={demoWorkspaceValue}>
      {children}
    </DemoWorkspaceContext.Provider>
  );
}

export function useDemoWorkspace() {
  return useContext(DemoWorkspaceContext);
}
