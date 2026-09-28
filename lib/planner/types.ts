import type { PlanningPreferences } from './preferences';

export type PlannerTask = {
  id: string; user_id: string; assignment_id: string | null; class_id: string | null;
  title: string; description: string | null; scheduled_date: string; priority: string | null;
  status: string; source: string; context_version: number; user_edited: boolean; pinned: boolean;
  checklist: string[];
  estimated_minutes?: number | null;
};
export type PlannerAssignment = { id: string; title: string; due_date: string | null; status: string; context_version: number; class_id: string | null; importance: string; description?: string | null; deadline_evidence?: { kind?: string } | null };
export type PlannerWorkspace = {
  version: string;
  tasks: PlannerTask[];
  assignments: PlannerAssignment[];
  sessions: { id: string; assignment_id: string | null; planner_task_id: string | null }[];
  preferences: PlanningPreferences;
  lastChangeId: string | null;
};
export type TaskChange = { before: PlannerTask | null; after: PlannerTask | null };
export type PlanBlock = { id: string; title: string; scheduledDate: string; previousDate?: string; reason: string; checklist?: string[] };
export type PlanConflict = { title: string; reason: string; dueDate?: string | null };
export type PlannerPreview = {
  version: string; blocks: PlanBlock[]; conflicts: PlanConflict[];
  existingCounts: Record<string, number>; preferences: PlanningPreferences;
  protectedCount?: number; changes?: TaskChange[];
};
