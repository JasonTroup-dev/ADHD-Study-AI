import { addPlanningDays, capacityOnDate, type PlanningPreferences } from './preferences';
import type { PlannerTask, PlannerWorkspace, PlannerPreview, TaskChange } from './types';
import { getExamBoundary, plannerCourseItems } from './courseSequence';

export function isProtectedTask(task: PlannerTask, workspace: PlannerWorkspace) {
  return task.status !== 'todo' || task.pinned || task.user_edited
    || !['generic_generated', 'context_generated'].includes(task.source)
    || workspace.assignments.some(a => a.id === task.assignment_id && a.status === 'completed')
    || workspace.sessions.some(session => session.planner_task_id === task.id
      || (task.assignment_id !== null && session.planner_task_id === null && session.assignment_id === task.assignment_id));
}

export function countTasks(tasks: PlannerTask[]) {
  const counts: Record<string, number> = {};
  for (const task of tasks) counts[task.scheduled_date] = (counts[task.scheduled_date] ?? 0) + 1;
  return counts;
}

export function previewCatchUp(workspace: PlannerWorkspace, today: string, preferences: PlanningPreferences): PlannerPreview {
  const editable = workspace.tasks.filter(task => !isProtectedTask(task, workspace));
  const fixed = workspace.tasks.filter(task => isProtectedTask(task, workspace));
  const counts = countTasks(fixed);
  const changes: TaskChange[] = [];
  const blocks: PlannerPreview['blocks'] = [];
  const conflicts: PlannerPreview['conflicts'] = [];
  const minutes: Record<string, number> = {};
  const unknownDates = new Set<string>();
  for (const task of fixed.filter(task => task.status !== 'completed')) {
    if (task.estimated_minutes == null) unknownDates.add(task.scheduled_date);
    else minutes[task.scheduled_date] = (minutes[task.scheduled_date] ?? 0) + task.estimated_minutes;
  }
  for (const [date, limit] of Object.entries(preferences.dateMinutes ?? {})) {
    if (date < today) continue;
    if (unknownDates.has(date) || (minutes[date] ?? 0) > limit) {
      conflicts.push({ title: `Study time on ${date}`, reason: unknownDates.has(date)
        ? 'A task kept in place needs a time estimate before this day’s time limit can be checked.'
        : 'Tasks kept in place exceed your time limit. Increase the time available or manually move a task.' });
    }
  }
  const assignmentById = new Map(workspace.assignments.map(a => [a.id, a]));
  const courseItems = plannerCourseItems(workspace.assignments);
  const nextByAssignment = new Map<string, string>();
  const horizon = addPlanningDays(today, 730);
  editable.sort((a,b) => {
    const dueA = assignmentById.get(a.assignment_id ?? '')?.due_date ?? horizon;
    const dueB = assignmentById.get(b.assignment_id ?? '')?.due_date ?? horizon;
    return dueA.localeCompare(dueB) || (a.assignment_id ?? a.id).localeCompare(b.assignment_id ?? b.id)
      || a.scheduled_date.localeCompare(b.scheduled_date) || a.id.localeCompare(b.id);
  });
  for (const task of editable) {
    const assignment = assignmentById.get(task.assignment_id ?? '');
    const due = assignment?.due_date;
    const latest = due && due >= today ? (due === today ? today : addPlanningDays(due, -1)) : addPlanningDays(today, 13);
    const key = task.assignment_id ?? task.id;
    const courseItem = courseItems.find(item => item.id === task.assignment_id);
    const examBoundary = courseItem ? getExamBoundary(courseItem, courseItems, today) : null;
    const earliest = [nextByAssignment.get(key) ?? today, examBoundary?.earliestDate ?? today].sort().at(-1)!;
    // A fixed later milestone is a boundary: unfinished preceding work cannot jump past it.
    const boundary = fixed.filter(t => t.assignment_id === task.assignment_id && task.assignment_id !== null && t.scheduled_date > task.scheduled_date)
      .map(t => t.scheduled_date).sort()[0];
    const end = boundary && boundary <= latest ? addPlanningDays(boundary, -1) : latest;
    const dates: string[] = [];
    for (let date = earliest; date <= end && date <= horizon; date = addPlanningDays(date, 1)) dates.push(date);
    // Keep future work near its current date; only missed work starts at today.
    const ideal = task.scheduled_date < today ? today : task.scheduled_date;
    dates.sort((a,b) => Math.abs(Date.parse(a) - Date.parse(ideal)) - Math.abs(Date.parse(b) - Date.parse(ideal)) || a.localeCompare(b));
    const selected = dates.find(date => {
      if ((counts[date] ?? 0) >= capacityOnDate(date, preferences)) return false;
      const limit = preferences.dateMinutes?.[date];
      return limit === undefined || (task.estimated_minutes != null && !unknownDates.has(date)
        && (minutes[date] ?? 0) + task.estimated_minutes <= limit);
    }) ?? null;
    if (!selected) {
      conflicts.push({ title: task.title, dueDate: due, reason: `${examBoundary ? `${examBoundary.reason} ` : ''}No available block fits before the deadline or next protected milestone. Adjust availability${task.estimated_minutes == null ? ' or add a time estimate' : ''}.` });
      continue;
    }
    counts[selected] = (counts[selected] ?? 0) + 1;
    if (task.estimated_minutes == null) unknownDates.add(selected);
    else minutes[selected] = (minutes[selected] ?? 0) + task.estimated_minutes;
    nextByAssignment.set(key, addPlanningDays(selected, 1));
    const reason = examBoundary?.reason ?? (due && due < today ? 'Recovery block for a missed deadline; the original deadline stays unchanged.'
      : task.scheduled_date < today ? 'Unfinished work moved to an available day before its deadline.'
      : 'Balanced with your other classes and available study days.');
    blocks.push({ id: task.id, title: task.title, scheduledDate: selected, previousDate: task.scheduled_date, reason, checklist: task.checklist });
    if (selected !== task.scheduled_date) changes.push({ before: task, after: { ...task, scheduled_date: selected } });
  }
  return { version: workspace.version, blocks, conflicts, changes, existingCounts: countTasks(fixed), preferences, protectedCount: fixed.length };
}
