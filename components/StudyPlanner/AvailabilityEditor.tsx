"use client";
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PlanningPreferences } from '@/lib/planner/preferences';

const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export function AvailabilityEditor({ value, onChange, disabled = false }: { value: PlanningPreferences; onChange: (value: PlanningPreferences) => void; disabled?: boolean }) {
  const id = useId();
  const [dayOff, setDayOff] = useState('');
  return <fieldset disabled={disabled} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
    <legend className="px-1 text-sm font-semibold text-slate-900">Your study availability</legend>
    <label className="block text-xs font-medium text-slate-600" htmlFor={`${id}-limit`}>Maximum study blocks per day</label>
    <select id={`${id}-limit`} value={value.maxTasksPerDay} onChange={event => {
      const max = Number(event.target.value);
      onChange({ ...value, maxTasksPerDay: max, weekdayCapacity: value.weekdayCapacity.map(cap => cap === value.maxTasksPerDay ? max : Math.min(cap, max)) });
    }} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'block' : 'blocks'}</option>)}
    </select>
    <p className="text-xs leading-5 text-slate-500">Choose fewer blocks for a lighter day, or Off for a day without study. New plans stay within these limits.</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {days.map((day,index) => <label key={day} className="text-xs text-slate-600" htmlFor={`${id}-${index}`}>
        {day}
        <select id={`${id}-${index}`} aria-label={day} className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm" value={value.weekdayCapacity[index]} onChange={event => onChange({ ...value, weekdayCapacity: value.weekdayCapacity.map((cap,i) => i === index ? Number(event.target.value) : cap) })}>
          {Array.from({ length: value.maxTasksPerDay + 1 }, (_,n) => <option key={n} value={n}>{n === 0 ? 'Off' : `${n} ${n === 1 ? 'block' : 'blocks'}`}</option>)}
        </select>
      </label>)}
    </div>
    {Object.keys(value.dateMinutes ?? {}).length > 0 ? <div>
      <p className="text-xs font-medium text-slate-600">Daily time limits</p>
      <ul className="mt-2 space-y-2">{Object.entries(value.dateMinutes ?? {}).sort(([a],[b]) => a.localeCompare(b)).map(([date,minutes]) => <li key={date} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span>{date} · {minutes === 0 ? 'Day off' : `${minutes} minutes`}</span><button type="button" className="min-h-8 rounded px-2 underline" aria-label={`Clear time limit for ${date}`} onClick={() => { const dateMinutes = { ...value.dateMinutes }; delete dateMinutes[date]; onChange({ ...value, dateMinutes }); }}>Clear</button></li>)}</ul>
    </div> : null}
    <div>
      <label htmlFor={`${id}-off`} className="text-xs font-medium text-slate-600">Specific day off</label>
      <div className="mt-1 flex gap-2">
        <input id={`${id}-off`} type="date" value={dayOff} onChange={e => setDayOff(e.target.value)} className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 text-sm" />
        <Button type="button" size="sm" variant="outline" disabled={!dayOff || value.unavailableDates.length >= 366} onClick={() => { onChange({ ...value, unavailableDates: [...new Set([...value.unavailableDates, dayOff])].sort() }); setDayOff(''); }}>Add</Button>
      </div>
      {value.unavailableDates.length > 0 ? <ul className="mt-2 flex flex-wrap gap-2">{value.unavailableDates.map(date => <li key={date}><button type="button" aria-label={`Remove day off ${date}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs" onClick={() => onChange({ ...value, unavailableDates: value.unavailableDates.filter(d => d !== date) })}>{date} ×</button></li>)}</ul> : null}
    </div>
  </fieldset>;
}
