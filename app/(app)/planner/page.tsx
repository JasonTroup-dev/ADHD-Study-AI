"use client";

import { useMemo } from 'react';
import { useDemoWorkspace } from '@/components/demo/DemoWorkspaceProvider';
import { WeeklyPlanner } from '@/components/StudyPlanner/WeeklyPlanner';
import type { WeeklyPlannerData } from '@/components/StudyPlanner/useWeeklyPlanner';

export default function PlannerPage() {
  const demo = useDemoWorkspace();
  const data = useMemo<WeeklyPlannerData | undefined>(() => demo ? {
    tasks: demo.tasks,
    classes: demo.classes.map(({ id, name, color }) => ({ id, name, color })),
    assignments: demo.calendarItems.filter(item => item.kind === 'assignment').map(item => ({
      id: item.id, title: item.title, due_date: item.date, status: item.isComplete ? 'completed' : 'todo',
      class_id: demo.classes.find(course => course.classCode === item.className)?.id ?? null,
      classes: { name: item.className, color: item.classColor },
    })),
  } : undefined, [demo]);
  return <WeeklyPlanner initialData={data} initialDate={demo?.date} readOnly={demo !== null} />;
}
