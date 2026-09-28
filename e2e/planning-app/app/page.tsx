"use client";
import { useState } from 'react';
import StudyPlannerModal from '../../../components/StudyPlanner/StudyPlannerModal';
import { CatchUpPlanner } from '../../../components/StudyPlanner/CatchUpPlanner';
import { WorkBreakdownPlanner } from '../../../components/assignments/WorkBreakdownPlanner';
import { SchedulePreview } from '../../../components/StudyPlanner/SchedulePreview';
import { Button } from '../../../components/ui/button';
const preferences = {maxTasksPerDay:3,weekdayCapacity:[0,3,3,1,3,3,0],unavailableDates:[]};
export default function PlannerFixture() {
  const [open,setOpen] = useState(false);
  const [notice,setNotice] = useState('');
  return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-5xl space-y-6">
    <h1 className="text-3xl font-semibold">Planning interface test</h1>
    <div className="flex flex-wrap gap-3"><Button onClick={() => setOpen(true)}>Generate Study Plan</Button><CatchUpPlanner onChanged={() => setNotice('Planner refreshed')} /><WorkBreakdownPlanner assignmentId="00000000-0000-4000-8000-000000000003" /></div>
    {notice ? <p role="status">{notice}</p> : null}
    <StudyPlannerModal isOpen={open} classes={[]} onClose={() => setOpen(false)} onStudyPlanCreated={() => setNotice('Study plan created')} />
    <SchedulePreview preview={{version:'v',preferences,conflicts:[],existingCounts:{'2026-09-08':1},blocks:[{id:'1',title:'Essay: Compare two sources',scheduledDate:'2026-09-08',reason:'Start with the evidence before drafting.',checklist:['Three supporting claims are written.']},{id:'2',title:'Essay: Draft the comparison',scheduledDate:'2026-09-10',previousDate:'2026-09-07',reason:'Moved around your lighter Wednesday.',checklist:['Each claim cites a source.']}]}} />
  </div></main>;
}
