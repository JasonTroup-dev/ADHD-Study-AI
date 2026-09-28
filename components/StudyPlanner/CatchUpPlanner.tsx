"use client";
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { defaultPlanningPreferences, type PlanningPreferences } from '@/lib/planner/preferences';
import type { PlannerPreview } from '@/lib/planner/types';
import { getLocalDateOnly } from './study-plan-modal/validation';
import { AvailabilityEditor } from './AvailabilityEditor';
import { SchedulePreview } from './SchedulePreview';

export function CatchUpPlanner({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<PlanningPreferences>(defaultPlanningPreferences);
  const [preview, setPreview] = useState<PlannerPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch('/api/planner', { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPreferences(data.preferences); setUndoId(data.lastChangeId); setLoaded(true);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [open]);
  async function run(action: 'preview' | 'apply' | 'undo') {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch('/api/planner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, planningDate: getLocalDateOnly(), preferences, version: preview?.version, undoId }) });
      const data = await response.json();
      if (!response.ok) { if (response.status === 409) setPreview(null); throw new Error(data.error); }
      if (action === 'preview') setPreview(data);
      else { setPreview(null); setUndoId(action === 'undo' ? null : data.changeId); setNotice(action === 'undo' ? 'Your previous task plan was restored.' : `${data.updatedTaskCount} tasks rescheduled. Your availability is saved.`); onChanged(); }
    } catch (e) { setError(e instanceof Error ? e.message : 'The plan could not be updated.'); }
    finally { setBusy(false); }
  }
  return <>
    <Button type="button" variant="outline" onClick={() => { setOpen(true); setLoaded(false); setPreview(null); setError(null); }}>Help me catch up</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90svh] max-w-5xl overflow-y-auto p-5 sm:p-6" aria-busy={busy}>
        <DialogTitle className="pr-8">Make room for your next step</DialogTitle>
        <DialogDescription>Rebalance unfinished work across your classes. Completed, started, edited, and pinned tasks stay in place. Missed deadlines stay visible.</DialogDescription>
        <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <AvailabilityEditor value={preferences} disabled={busy || !loaded} onChange={value => { setPreferences(value); setPreview(null); }} />
          <div className="space-y-4">
            {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
            {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}
            {preview ? <SchedulePreview preview={preview} /> : <p className="text-sm text-slate-600">Check your available days, then preview a plan you can review before saving.</p>}
          </div>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t pt-4">
          {undoId ? <Button variant="outline" disabled={busy || !loaded} onClick={() => void run('undo')}>Undo last plan change</Button> : null}
          <Button variant="outline" disabled={busy || !loaded} onClick={() => void run('preview')}>{busy ? 'Working…' : 'Preview catch-up plan'}</Button>
          <Button disabled={busy || !preview || preview.conflicts.length > 0} onClick={() => void run('apply')}>Apply this plan</Button>
        </footer>
      </DialogContent>
    </Dialog>
  </>;
}
