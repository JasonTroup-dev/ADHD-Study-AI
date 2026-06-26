"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  Brain,
  Bug,
  ChevronRight,
  PanelLeftClose,
  PanelRightClose,
  Settings,
} from "lucide-react";
import { getClassColor } from "@/lib/classColors";
import { CLASSES_CHANGED_EVENT } from "@/lib/classEvents";
import { supabase } from "@/lib/supabase/client";

type SidebarClass = {
  id: string;
  class_code: string;
  color: string | null;
};

type SidebarDropdownProps = {
  children: ReactNode;
  href: string;
  label: string;
  onToggle: () => void;
  open: boolean;
};

function SidebarDropdown({
  children,
  href,
  label,
  onToggle,
  open,
}: SidebarDropdownProps) {
  const contentId = useId();

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href={href} className="text-2xl">
          {label}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-controls={contentId}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
          className="rounded-md p-1 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <ChevronRight
            aria-hidden="true"
            className={`size-5 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      <div
        id={contentId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`flex flex-col gap-2 pl-6 pt-2 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "translate-y-0" : "-translate-y-1"}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {

  const [classesOpen, setClassesOpen] = useState(true);
  const [studyToolsOpen, setStudyToolsOpen] = useState(true);
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [classes, setClasses] = useState<SidebarClass[]>([]);

  useEffect(() => {
    let isActive = true;

    async function loadClasses() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("classes")
        .select("id, class_code, color")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching sidebar classes:", error);
        return;
      }

      if (isActive) setClasses(data ?? []);
    }

    void loadClasses();
    window.addEventListener(CLASSES_CHANGED_EVENT, loadClasses);

    return () => {
      isActive = false;
      window.removeEventListener(CLASSES_CHANGED_EVENT, loadClasses);
    };
  }, []);

  return (
    // Entire Screen
    <div className="fixed inset-0 flex overflow-hidden">

      {/*Sidebar*/}
      <aside className={`flex flex-col shrink-0 overflow-hidden bg-gray-100 border-r border-gray-300 transition-[width] duration-200 ${sidebarOpen ? "w-64" : "w-20"}`}>
        
        {/*Logo & Title*/}
        <div className={`flex flex-row p-4 ${sidebarOpen ? "" : "justify-center"}`}>

          <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-linear-to-br from-blue-500 to-purple-700">
            {/*Fix alt when actual image is used*/}
            <Brain className="items-center text-gray-100"/>
          </div>
          
          <div className={sidebarOpen ? "flex-1 flex justify-center items-center" : "hidden"}>
            <h1 className="text-2xl font-semibold">ADHD Study AI</h1>
          </div>
        </div>

        <div className="my-2 h-px w-full bg-gray-300"></div>

        <div className="flex-1 flex flex-col justify-between p-4">
          <div className={sidebarOpen ? "flex flex-col gap-4" : "hidden"}>
            {/*Dashboard Tab*/}
            <div className="flex items-center">
              <Link href="/dashboard" className="text-2xl">
                Dashboard
              </Link>
            </div>

            {/*Classes Tab*/}
            <SidebarDropdown
              href="/classes"
              label="Classes"
              open={classesOpen}
              onToggle={() => setClassesOpen((open) => !open)}
            >
              {classes.map((classItem) => {
                const color = getClassColor(classItem.color);

                return (
                  <Link
                    key={classItem.id}
                    href={`/classes/${classItem.id}`}
                    className={`flex items-center gap-2 rounded-md px-2 py-1 ${color.bg} ${color.text}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.accent}`}
                    />
                    {classItem.class_code}
                  </Link>
                );
              })}
            </SidebarDropdown>


            {/*Study Tools Tab*/}
            <SidebarDropdown
              href="/study"
              label="Study Tools"
              open={studyToolsOpen}
              onToggle={() => setStudyToolsOpen((open) => !open)}
            >
              <Link href="/study/ai-tutor">AI Tutor</Link>
              <Link href="/study/study-guide">Study Guides</Link>
              <Link href="/study/flashcards">Flashcards</Link>
            </SidebarDropdown>

            {/*Planner Tab*/}
            <SidebarDropdown
              href="/planner"
              label="Planner"
              open={plannerOpen}
              onToggle={() => setPlannerOpen((open) => !open)}
            >
              <Link href="/calendar">Calendar</Link>
              <Link href="/planner/progress">Progress</Link>
              <Link href="/planner/assignments">Assignments</Link>
            </SidebarDropdown>
          </div>

          <div className={`mt-auto flex ${sidebarOpen ? "items-end justify-between gap-3" : "flex-col items-center gap-2"}`}>
            <div className="flex flex-col gap-2">
              <Link
                href="/report-bug"
                aria-label="Report a bug"
                className="flex items-center rounded-full p-2 hover:bg-gray-200"
              >
                <Bug className={sidebarOpen ? "mr-2" : ""}/>
                <p className={sidebarOpen ? "" : "hidden"}>Report a bug</p>
              </Link>

              <Link
                href="/settings"
                aria-label="Settings"
                className="flex items-center rounded-full p-2 hover:bg-gray-200"
              >
                <Settings className={sidebarOpen ? "mr-2" : ""}/>
                <p className={sidebarOpen ? "" : "hidden"}>Settings</p>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={sidebarOpen}
              className="hover:bg-gray-200 rounded-lg p-2">{sidebarOpen ? (<PanelLeftClose className="opacity-25"/>) : (<PanelRightClose className="opacity-75"/>)}
            </button>
          </div>

        </div>
      </aside>

      {/*Page Content*/}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
