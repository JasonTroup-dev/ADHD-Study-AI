"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateStudySessionTime } from "@/lib/studySessions";
import { type StudyTimeRecord, formatStudyMinutes } from "@/lib/studyTime";
import { StudyTimeInput } from "./StudyTimeInput";

export function SessionTimeEditor({ session, onSaved }: {
  session: StudyTimeRecord & { id: string };
  onSaved: (saved: StudyTimeRecord) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const confirmed = Boolean(session.time_confirmed_at);

  async function save(minutes: string) {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateStudySessionTime(session.id, minutes);
      onSaved(saved);
      setEditing(false);
      setNotice(minutes.trim() ? "Study time saved." : "Time removed. Your session still counts.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save study time.");
    } finally { setSaving(false); }
  }

  return <div className="mt-2">
    <div className="flex flex-wrap items-center gap-3">
      <span className={`rounded-full px-2.5 py-1 text-xs ${confirmed ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{confirmed ? `${formatStudyMinutes(session.actual_minutes ?? 0)} logged` : "Time not logged"}</span>
      {!editing && <Button type="button" size="sm" variant="outline" onClick={() => { setValue(confirmed ? String(session.actual_minutes ?? 0) : ""); setEditing(true); setError(null); setNotice(""); }}>{confirmed ? "Edit time" : "Log time"}</Button>}
    </div>
    {!confirmed && session.actual_minutes !== null && <p className="mt-2 text-xs leading-5 text-amber-800">Old timer: {formatStudyMinutes(session.actual_minutes)} · Unverified, excluded from totals</p>}
    {editing && <form className="mt-3 rounded-xl bg-gray-50 p-4" onSubmit={(event) => { event.preventDefault(); void save(value); }}>
      <StudyTimeInput value={value} onChange={setValue} disabled={saving} />
      <div className="mt-4 flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save time"}</Button><Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button>{session.actual_minutes !== null && <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => void save("")}>Remove time</Button>}</div>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <p role="status" className="mt-1 text-xs text-emerald-700">{notice}</p>
  </div>;
}
