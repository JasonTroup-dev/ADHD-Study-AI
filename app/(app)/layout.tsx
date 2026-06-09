"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { Brain } from "lucide-react";
import { Settings } from "lucide-react";
import { PanelLeftClose } from "lucide-react";
import { PanelRightClose } from "lucide-react";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {

  const [classesOpen, setClassesOpen] = useState(true);
  const [studyToolsOpen, setStudyToolsOpen] = useState(true);
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);


  return (
    // Entire Screen
    <div className="flex h-screen overflow-hidden">

      {/*Sidebar*/}
      <aside className="flex flex-col w-64 shrink-0 bg-gray-100 border-r border-gray-300">
        
        {/*Logo & Title*/}
        <div className="flex flex-row p-4">

          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-purple-700">
            {/*Fix alt when actual image is used*/}
            <Brain className="items-center text-gray-100"/>
          </div>
          
          <div className="flex-1 flex justify-center items-center">
            <h1 className="text-2xl font-semibold">ADHD Study AI</h1>
          </div>
        </div>

        <div className="my-2 h-px w-full bg-gray-300"></div>

        <div className="flex-1 flex flex-col justify-between p-4">
          <div className="flex flex-col gap-4">
            {/*Dashboard Tab*/}
            <div className="flex items-center">
              <Link href="/dashboard" className="text-2xl">
                Dashboard
              </Link>
            </div>

            {/*Classes Tab*/}
            <div className="">
              <div className="flex items-center justify-between">
                <Link href="/classes" className="text-2xl">
                  Classes
                </Link>
                <button
                onClick={() => setClassesOpen(!classesOpen)} className="text-xl">{classesOpen ? "v" : ">"}
                </button>
              </div>

              {classesOpen && (
              <div className="pl-6 pt-2 flex flex-col gap-2">
                <Link href="/classes/BIO101">Biology 101</Link>
                <Link href="/classes/HIS203">History 203</Link>
              </div>
              )}
            </div>


            {/*Study Tools Tab*/}
            <div className="">
              <div className="flex items-center justify-between">
                <Link href="/study" className="text-2xl">
                  Study Tools
                </Link>

              <button
              onClick={() => setStudyToolsOpen(!studyToolsOpen)} className="text-xl">{studyToolsOpen ? "v" : ">"}
              </button>
              </div>
                {studyToolsOpen && (
                <div className="pl-6 pt-2 flex flex-col gap-2">
                  <Link href="/study/ai-tutor">AI Tutor</Link>
                  <Link href="/study/study-guide">Study Guides</Link>
                  <Link href="/study/flashcards">Flashcards</Link>
                </div>
              )}
            </div>

            {/*Planner Tab*/}
            <div className="">
              <div className="flex items-center justify-between">
                <Link href="/planner" className="text-2xl">
                  Planner
                </Link>

              <button
              onClick={() => setPlannerOpen(!plannerOpen)} className="text-xl">{plannerOpen ? "v" : ">"}
              </button>
              </div>
                {plannerOpen && (
                <div className="pl-6 pt-2 flex flex-col gap-2">
                  <Link href="/calendar">Calendar</Link>
                  <Link href="/planner/progress">Progress</Link>
                </div>
              )}
            </div>

          </div>

          <div className="flex justify-between items-center">
            <Link
              href="/settings"
              className="flex items-center rounded-full p-2 hover:bg-gray-200"
            >
              <Settings className="mr-2"/>
              <p className="">Settings</p>
            </Link>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="hover:bg-gray-200 rounded-lg p-2">{sidebarOpen ? (<PanelLeftClose className="opacity-25"/>) : (<PanelRightClose className="opacity-75"/>)}
            </button>
          </div>

        </div>
      </aside>

      {/*Page Content*/}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
