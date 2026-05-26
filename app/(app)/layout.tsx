"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {

  const [classesOpen, setClassesOpen] = useState(true);
  const [studyToolsOpen, setStudyToolsOpen] = useState(true);
  const [plannerOpen, setPlannerOpen] = useState(true);


  return (
    // Entire Screen
    <div className="flex h-screen overflow-hidden">

      {/*Sidebar*/}
      <aside className="flex flex-col w-64 shrink-0 bg-gray-600 border border-green-700">
        
        {/*Logo & Title*/}
        <div className="flex flex-row border border-green-700">

          {/*Logo*/}
          <div className="w-10 h-10 border border-red-500">
            {/*Fix alt when actual image is used*/}
            <img src="/logo.png" alt=""/>
          </div>

          {/*Title*/}
          <div className="flex-1 flex justify-center">
            <h1 className="text-3xl border border-blue-500">ADHD Study AI</h1>
          </div>
        </div>

        <div>
        {/*Dashboard Tab*/}
          <div className="border border-blue-500">
            <div className="flex items-center justify-between py-4 px-4">
              <Link href="/dashboard" className="text-2xl">
                Dashboard
              </Link>
            </div>
          </div>

        {/*Classes Tab*/}
          <div className="border border-blue-500">
            <div className="flex items-center justify-between py-4 px-4">
              <Link href="/classes" className="text-2xl">
                Classes
              </Link>

            <button
            onClick={() => setClassesOpen(!classesOpen)} className="text-xl">{classesOpen ? "v" : ">"}
            </button>
            </div>
              {classesOpen && (
              <div className="pl-8 pb-4 flex flex-col gap-2">
                <Link href="/classes/BIO101">Biology 101</Link>
                <Link href="/classes/HIS203">History 203</Link>
              </div>
            )}
          </div>


        {/*Study Tools Tab*/}
          <div className="border border-blue-500">
            <div className="flex items-center justify-between py-4 px-4">
              <Link href="/study" className="text-2xl">
                Study Tools
              </Link>

            <button
            onClick={() => setStudyToolsOpen(!studyToolsOpen)} className="text-xl">{studyToolsOpen ? "v" : ">"}
            </button>
            </div>
              {studyToolsOpen && (
              <div className="pl-8 pb-4 flex flex-col gap-2">
                <Link href="/study/ai-tutor">AI Tutor</Link>
                <Link href="/StudyTools/StudyGuides">Study Guides</Link>
                <Link href="/study/flashcards">Flashcards</Link>
              </div>
            )}
          </div>

        {/*Planner Tab*/}
          <div className="border border-blue-500">
            <div className="flex items-center justify-between py-4 px-4">
              <Link href="/planner" className="text-2xl">
                Planner
              </Link>

            <button
            onClick={() => setPlannerOpen(!plannerOpen)} className="text-xl">{plannerOpen ? "v" : ">"}
            </button>
            </div>
              {plannerOpen && (
              <div className="pl-8 pb-4 flex flex-col gap-2">
                <Link href="/calendar">Calendar</Link>
                <Link href="/Planner/Progress">Progress</Link>
              </div>
            )}
          </div>

        </div>
      </aside>

      {/*Page Content*/}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}