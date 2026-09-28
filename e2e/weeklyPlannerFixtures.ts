import type { WeeklyPlannerData } from "../components/StudyPlanner/useWeeklyPlanner";
export const weeklyPlannerFixture: WeeklyPlannerData = {
  classes: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "PHY 121",
      color: "purple",
    },
  ],
  assignments: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      title: "Problem set 3",
      due_date: "2026-10-16",
      status: "not_started",
      class_id: "00000000-0000-4000-8000-000000000001",
      classes: { name: "PHY 121", color: "purple" },
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      title: "Forces quiz",
      due_date: "2026-10-19",
      status: "not_started",
      class_id: "00000000-0000-4000-8000-000000000001",
      classes: { name: "PHY 121", color: "purple" },
    },
  ],
  tasks: [
    {
      id: "00000000-0000-4000-8000-000000000011",
      title: "Work through problems 1 and 2",
      assignment_id: "00000000-0000-4000-8000-000000000002",
      class_id: "00000000-0000-4000-8000-000000000001",
      status: "todo",
      priority: "high",
      scheduled_date: "2026-10-13",
      estimated_minutes: 20,
      checklist: ["Open the worksheet and read problem 1."],
      classes: { name: "PHY 121", color: "purple" },
      source: "generic_generated",
    },
    {
      id: "00000000-0000-4000-8000-000000000012",
      title: "Practice drawing free-body diagrams",
      assignment_id: "00000000-0000-4000-8000-000000000003",
      class_id: "00000000-0000-4000-8000-000000000001",
      status: "todo",
      priority: "medium",
      scheduled_date: "2026-10-13",
      estimated_minutes: 25,
      checklist: ["Sketch the forces acting on a resting book."],
      classes: { name: "PHY 121", color: "purple" },
      source: "generic_generated",
    },
  ],
};
