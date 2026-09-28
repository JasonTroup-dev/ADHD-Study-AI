"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function PinTaskButton({ taskId, pinned }: { taskId: string; pinned: boolean }) {
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string | null>(null);
  async function toggle() {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/study-plan-tasks/${taskId}`, { method:'PATCH', headers:{'Content-Type':'application/json'},body:JSON.stringify({pinned:!pinned}) });
      if (!response.ok) throw new Error('Your pin setting could not be saved.');
      router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <div><Button size="sm" variant="outline" aria-pressed={pinned} disabled={busy} onClick={() => void toggle()}><Pin className="size-4" aria-hidden="true" />{pinned ? 'Unpin task' : 'Pin task'}</Button>{error ? <p role="alert" className="mt-1 text-xs text-red-700">{error}</p> : null}</div>;
}
