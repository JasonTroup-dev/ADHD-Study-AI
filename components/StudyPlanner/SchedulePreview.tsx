"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { addPlanningDays, capacityOnDate } from '@/lib/planner/preferences';
import type { PlannerPreview } from '@/lib/planner/types';

function weekStart(date: string) { return addPlanningDays(date, -new Date(`${date}T00:00:00Z`).getUTCDay()); }
export function SchedulePreview({ preview }: { preview: PlannerPreview }) {
  const dates = preview.blocks.map(b => b.scheduledDate).sort();
  const weeks = [...new Set(dates.map(weekStart))];
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const week = selectedWeek && weeks.includes(selectedWeek) ? selectedWeek : weeks[0];
  const index = weeks.indexOf(week);
  return <section aria-label="Schedule preview" className="space-y-4">
    <div>
      <h3 className="text-lg font-semibold text-slate-950">Your proposed schedule</h3>
      <p className="mt-1 text-sm text-slate-600">{preview.blocks.length} proposed blocks{preview.protectedCount !== undefined ? ` · ${preview.protectedCount} protected tasks kept in place` : ''}. Changes are saved only when you apply this plan.</p>
    </div>
    {preview.conflicts.length > 0 ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">{preview.conflicts.length} blocks need attention</p>
      <p className="mt-1">Adjust availability or reduce the selected workload, then preview again. Nothing will be silently overbooked.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">{preview.conflicts.map((c,i) => <li key={i}><span className="font-medium">{c.title}</span>: {c.reason}{c.dueDate ? ` Deadline: ${c.dueDate}.` : ''}</li>)}</ul>
    </div> : null}
    {week ? <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="sm" variant="outline" disabled={index <= 0} onClick={() => setSelectedWeek(weeks[index - 1])}>Previous week</Button>
        <label className="text-sm">Week of <select aria-label="Preview week" className="rounded-md border border-slate-300 bg-white p-2" value={week} onChange={e => setSelectedWeek(e.target.value)}>{weeks.map(w => <option key={w} value={w}>{w}</option>)}</select></label>
        <Button type="button" size="sm" variant="outline" disabled={index >= weeks.length - 1} onClick={() => setSelectedWeek(weeks[index + 1])}>Next week</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 7 }, (_,day) => addPlanningDays(week, day)).map(date => {
          const blocks = preview.blocks.filter(b => b.scheduledDate === date);
          const existing = preview.existingCounts[date] ?? 0;
          const capacity = capacityOnDate(date, preview.preferences);
          return <article key={date} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <h4 className="text-sm font-semibold">{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
            <p className="mt-1 text-xs text-slate-500">{existing} existing + {blocks.length} proposed / {capacity} available</p>
            {existing > capacity ? <p className="mt-1 text-xs text-amber-700">Existing work exceeds this day’s availability.</p> : null}
            <ul className="mt-3 space-y-2">{blocks.map(block => <li key={block.id} className="rounded-lg bg-blue-50 p-3 text-sm text-blue-950">
              <p className="font-medium">{block.title}</p>
              {block.previousDate && block.previousDate !== date ? <p className="mt-1 text-xs">Moved from {block.previousDate}</p> : null}
              <details className="mt-2 text-xs"><summary className="cursor-pointer">Why this block?</summary><p className="mt-1 leading-5">{block.reason}</p></details>
              {block.checklist?.length ? <ul className="mt-2 list-disc space-y-1 pl-4">{block.checklist.map(item => <li key={item}>{item}</li>)}</ul> : null}
            </li>)}</ul>
            {!blocks.length && !existing ? <p className="mt-3 text-xs text-slate-400">{capacity ? 'Open study space' : 'Day off'}</p> : null}
          </article>;
        })}
      </div>
    </> : <p className="text-sm text-slate-600">No blocks to schedule. Assignments without deadlines remain in your assignment list.</p>}
  </section>;
}
