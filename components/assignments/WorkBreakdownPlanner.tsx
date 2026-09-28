"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AvailabilityEditor } from '@/components/StudyPlanner/AvailabilityEditor';
import { SchedulePreview } from '@/components/StudyPlanner/SchedulePreview';
import { getLocalDateOnly } from '@/components/StudyPlanner/study-plan-modal/validation';
import { defaultPlanningPreferences, type PlanningPreferences } from '@/lib/planner/preferences';
import type { PlannerPreview } from '@/lib/planner/types';
import type { WorkBreakdown } from '@/lib/ai/workBreakdown';

type BreakdownPreview = PlannerPreview & { proposal: WorkBreakdown; previousTaskCount: number };
export function WorkBreakdownPlanner({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [preferences, setPreferences] = useState<PlanningPreferences>(defaultPlanningPreferences);
  const [preview, setPreview] = useState<BreakdownPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  async function openPlanner() {
    setOpen(true); setLoaded(false); setBusy(true); setError(null); setPreview(null);
    try {
      const response = await fetch('/api/planner');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPreferences(data.preferences); setLoaded(true);
    } catch(e) { setError(e instanceof Error ? e.message : 'Availability could not be loaded.'); }
    finally { setBusy(false); }
  }
  async function run(action: 'preview' | 'apply' | 'undo') {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch(action === 'undo' ? '/api/planner' : `/api/assignments/${assignmentId}/work-breakdown`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, planningDate: getLocalDateOnly(), preferences, version: preview?.version, proposal: preview?.proposal, undoId }),
      });
      const data = await response.json();
      if (!response.ok) { if (response.status === 409) setPreview(null); throw new Error(data.error); }
      if (action === 'preview') setPreview(data);
      else { setPreview(null); setUndoId(action === 'apply' ? data.changeId : null); setNotice(action === 'undo' ? 'Your previous tasks were restored.' : `${data.updatedTaskCount} concrete tasks saved with completion checklists.`); router.refresh(); }
    } catch(e) { setError(e instanceof Error ? e.message : 'The task plan could not be updated.'); }
    finally { setBusy(false); }
  }
  return <>
    <Button type="button" size="sm" variant="outline" onClick={() => void openPlanner()}>Plan concrete steps</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90svh] max-w-5xl overflow-y-auto p-5 sm:p-6" aria-busy={busy}>
        <DialogTitle className="pr-8">Turn this assignment into doable steps</DialogTitle>
        <DialogDescription>Use your uploaded instructions to propose smaller or combined tasks, each with a clear finish. Started, completed, edited, and pinned work is protected.</DialogDescription>
        <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <AvailabilityEditor value={preferences} disabled={busy || !loaded} onChange={value => { setPreferences(value); setPreview(null); }} />
          <div className="space-y-4">
            {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
            {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}
            {preview ? <>
              <p className="text-sm font-medium text-slate-800">Replace {preview.previousTaskCount} unfinished tasks with {preview.proposal.tasks.length} concrete steps.</p>
              <p className="text-sm text-slate-600">{preview.proposal.summary}</p>
              <details className="rounded-lg border border-slate-200 p-3 text-sm"><summary className="cursor-pointer font-medium">Check the source evidence</summary><ul className="mt-3 space-y-3">{preview.proposal.tasks.map((task,i) => <li key={i}><p className="font-medium">{task.title}</p><blockquote className="mt-1 border-l-2 border-blue-200 pl-3 text-xs leading-5 text-slate-600">{task.sourceQuote}<cite className="block">{task.sourceName}</cite></blockquote></li>)}</ul></details>
              <SchedulePreview preview={preview} />
            </> : <p className="text-sm text-slate-600">Preview a task breakdown based on the assignment instructions and supporting material you uploaded.</p>}
          </div>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t pt-4">
          {undoId ? <Button variant="outline" disabled={busy} onClick={() => void run('undo')}>Undo task changes</Button> : null}
          <Button variant="outline" disabled={busy || !loaded} onClick={() => void run('preview')}>{busy ? 'Working…' : 'Preview concrete steps'}</Button>
          <Button disabled={busy || !preview || preview.conflicts.length > 0} onClick={() => void run('apply')}>Apply task breakdown</Button>
        </footer>
      </DialogContent>
    </Dialog>
  </>;
}

