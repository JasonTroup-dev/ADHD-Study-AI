"use client"

import {
    getCalendarDays,
    toLocalDateString,
} from "@/lib/calendar/getCalendarDays";
import { Button } from "@/components/ui/button";
import { TaskCard, type StudyTask } from "@/components/ui/taskCard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import PlannerCalendar from "@/components/StudyPlanner/StudyPlannerCalendar";
import type { ClassColor } from "@/lib/classColors";
import StudyPlannerModal from "@/components/StudyPlanner/StudyPlannerModal";
import type { StudyPlanImportSummary } from "@/types/syllabus";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CompletionProgress } from "@/components/ui/completionProgress";
import { getActiveStudySession } from "@/lib/studySessions";
import type { StudySession } from "@/types/database";

type ClassItem = {
    id: string,
    name: string;
    color: ClassColor | null;
};

const STUDY_PLAN_NOTICE_DURATION_MS = 5_000;

export default function PlannerPage() {

    { /* Calendar Variables */}
    const weekDays= ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(
        () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
    const formattedDate = selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });

    function selectDate(date: Date) {
        setSelectedDate(date);
        setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }

    function changeSelectedDate(dayOffset: number) {
        selectDate(
            new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate() + dayOffset,
            ),
        );
    }

    function goToToday() {
        selectDate(new Date());
    }

    function isSameDay(dateOne: Date, dateTwo: Date) {
        return (
            dateOne.getFullYear() === dateTwo.getFullYear() &&
            dateOne.getMonth() === dateTwo.getMonth() &&
            dateOne.getDate() === dateTwo.getDate()
        );
    }

    // Generate Modal Variables

    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [studyPlanNotice, setStudyPlanNotice] = useState<string | null>(null);

    useEffect(() => {
        if (!studyPlanNotice) return;

        const timeoutId = window.setTimeout(
            () => setStudyPlanNotice(null),
            STUDY_PLAN_NOTICE_DURATION_MS,
        );

        return () => window.clearTimeout(timeoutId);
    }, [studyPlanNotice]);


    // Task Modal Variables

    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState("low");
    const [selectedClassId, setSelectedClassId] = useState("");
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);



    // Task Modal Calendar variables

    const [modalSelectedDate, setModalSelectedDate] = useState(new Date());
    const [modalCurrentMonth, setModalCurrentMonth] = useState(new Date());
    const modalCalendarDays = getCalendarDays(modalCurrentMonth);
    const modalMonthTitle = modalCurrentMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    function goToPreviousMonthModal() {
        setModalCurrentMonth((prev) => {
            return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
        });
    }

    function goToNextMonthModal() {
        setModalCurrentMonth((prev) => {
            return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
        });
    }

    //Supabase variables

    const [userId, setUserId] = useState<string | null>(null);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [tasks, setTasks] = useState<StudyTask[]>([]);
    const [activeStudySession, setActiveStudySession] =
        useState<StudySession | null>(null);
    const [taskRefreshToken, setTaskRefreshToken] = useState(0);

    const selectedDateString = toLocalDateString(selectedDate);

    async function handleAddTask () {
        if (!userId) return;

        const classId = selectedClassId;
        const trimmedTaskTitle = title.trim();

        if (!trimmedTaskTitle) return;

        if (!trimmedTaskTitle == null) return;

        const importance = priority;

        const scheduledDate = toLocalDateString(modalSelectedDate);

        const { error } = await supabase.from("study_plan_tasks").insert({
            user_id: userId,
            class_id: classId || null,
            title: trimmedTaskTitle,
            priority: importance,
            status: "todo",
            scheduled_date: scheduledDate,
            source: "manual",
            context_version: 0,
            user_edited: false,

        });

        if (error) {
            console.error("Error adding task:", error);
            return;
        }

        setIsTaskModalOpen(false);
        setTitle("");
        setPriority("");
        setSelectedClassId("");
    }

    useEffect(() => {
        async function loadUser() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            setUserId(user.id);
        }

        loadUser();
    }, []);

    
    useEffect(() => {
        async function loadClasses() {
            if (!userId) return;

            const { data, error } = await supabase
                .from("classes")
                .select("id, name, color")
                .eq("user_id", userId)
                .order("name", { ascending: true });

            if (error) {
                console.error("Error loading classes:", error);
                return;
            }

            setClasses(data ?? []);
        }

        loadClasses();
    }, [userId]);


    { /* Task Card Data */ }
    useEffect(() => {
        async function loadTasks() {
            if (!userId) return;

            const [tasksResult, activeSession] = await Promise.all([
                supabase
                    .from("study_plan_tasks")
                    .select(`
                        id,
                        class_id,
                        assignment_id,
                        title,
                        priority,
                        status,
                        scheduled_date,
                        source,
                        context_version,
                        user_edited,
                        classes (
                        name,
                        color
                        )
                    `)
                    .eq("user_id", userId)
                    .eq("scheduled_date", selectedDateString)
                    .order("created_at", { ascending: true }),
                getActiveStudySession().catch((error: unknown) => {
                    console.error("Error loading active study session:", error);
                    return null;
                }),
            ]);

            if (tasksResult.error) {
            console.error("Error loading tasks:", tasksResult.error);
            return;
            }

            setTasks(tasksResult.data ?? []);
            setActiveStudySession(activeSession);
        }

        loadTasks();
    }, [userId, selectedDateString, taskRefreshToken]);


    // Prograss Bar Variables
    const completedTasks = tasks.filter((task) => task.status === "completed").length;
    const totalTasks = tasks.length;

    const progressPercent =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    async function handleToggleTask(task: StudyTask) {
        const newStatus = task.status === "completed" ? "todo" : "completed";

        setTasks((prevTasks) =>
            prevTasks.map((item) =>
                item.id === task.id
                    ? { ...item, status: newStatus }
                    : item
            )
        );

        const { error } = await supabase
            .from("study_plan_tasks")
            .update({ status: newStatus })
            .eq("id", task.id);

        if (error) {
            console.error("Error updating task:", error);

            setTasks((prevTasks) =>
                prevTasks.map((item) =>
                    item.id === task.id
                        ? { ...item, status: task.status }
                        : item
                )
            );
        }
    }

    function handleCreateStudyPlan(summary: StudyPlanImportSummary) {
        setTaskRefreshToken((currentToken) => currentToken + 1);
        if (summary.classCreated) {
            setClasses((currentClasses) =>
                currentClasses.some((classItem) => classItem.id === summary.classId)
                    ? currentClasses
                    : [
                        ...currentClasses,
                        {
                            id: summary.classId,
                            name: summary.className,
                            color: "blue",
                        },
                    ],
            );
        }
        setStudyPlanNotice(
            `${summary.classCreated ? `${summary.className} was created. ` : ""}Study plan created with ${summary.assignmentCount} assignment${summary.assignmentCount === 1 ? "" : "s"} and ${summary.studySessionCount} study block${summary.studySessionCount === 1 ? "" : "s"}.`,
        );
    }

    return (
        <div className="min-h-full w-full bg-gray-100">
            <div className="mx-auto w-full max-w-screen-2xl px-6 py-8 lg:px-8">
                
                {/* Study Planner Title Div - Generate Plan Button */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-medium">Study Planner</h1>
                        <p className="text-xl text-gray-600 py-2">Organize your study schedule and stay on track</p>
                    </div>

                    <div className="pt-2">
                        <Button
                            className="text-base bg-linear-to-br from-purple-500 to-blue-500"
                            variant="default"
                            size="lg"
                            onClick={() => setIsGenerateModalOpen(true)}>
                            Generate AI Study Plan
                        </Button>
                    </div>
                </div>


                <StudyPlannerModal
                    isOpen={isGenerateModalOpen}
                    classes={classes}
                    onClose={() => setIsGenerateModalOpen(false)}
                    onStudyPlanCreated={handleCreateStudyPlan}
                />

                {studyPlanNotice ? (
                    <div
                        className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                        role="status"
                    >
                        <span>{studyPlanNotice}</span>
                        <button
                            type="button"
                            className="font-semibold text-emerald-900 hover:text-emerald-700"
                            onClick={() => setStudyPlanNotice(null)}
                        >
                            Dismiss
                        </button>
                    </div>
                ) : null}


                        {/* Progress Card */}
                        <div className="mt-8 rounded-2xl border bg-linear-to-r from-blue-100 to-indigo-200 p-8">
                            <h2 className="text-xl font-semibold">Todays Progress</h2>

                            <div className="flex justify-between mt-8">
                                <p className="text-lg text-gray-600">
                                {completedTasks} of {totalTasks} tasks completed
                                </p>

                                <p className="text-xl font-semibold">{progressPercent}%</p>
                            </div>

                            <CompletionProgress
                                value={progressPercent}
                                label={`${completedTasks} of ${totalTasks} tasks completed`}
                                className="mt-4 bg-white/70"
                                indicatorClassName="bg-linear-to-r from-blue-500 to-purple-500"
                            />
                        </div>


                        {/* Main Section */}
                        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">

                    {/* Calendar Card */}
                    <div className="rounded-2xl bg-white p-6 lg:col-span-4">
                        <div>
                            <h2 className="text-xl font-semibold">Calendar</h2>
                            <p className="text-gray-600">Select a date to view tasks</p>
                        </div>

                
                        <PlannerCalendar
                            selectedDate={selectedDate}
                            currentMonth={calendarMonth}
                            onSelectDate={selectDate}
                            onChangeMonth={setCalendarMonth}
                        />

                        <div className="my-6 h-px w-full bg-gray-300" />
                    </div>


                    {/* Daily TODO Card */}
                    <div className="flex max-h-[55vh] flex-col rounded-2xl border border-gray-200 bg-white p-6 lg:col-span-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold" aria-live="polite">{ formattedDate }</h2>
                                <p className="text-gray-600">{tasks.length} tasks scheduled</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Previous day"
                                        title="Previous day"
                                        onClick={() => changeSelectedDate(-1)}
                                    >
                                        <ChevronLeft aria-hidden="true" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={goToToday}
                                    >
                                        Today
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Next day"
                                        title="Next day"
                                        onClick={() => changeSelectedDate(1)}
                                    >
                                        <ChevronRight aria-hidden="true" />
                                    </Button>
                                </div>

                                <Button
                                    variant="default"
                                    size="default"
                                    onClick={() => setIsTaskModalOpen(true)}
                                >
                                    + Add Task
                                </Button>
                            </div>
                        </div>

                        {/* ToDo List Item Card */}
                        <div className="mt-8 flex-1 space-y-4 overflow-y-auto pr-2">
                            {tasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    activeStudySession={activeStudySession}
                                    onToggle={handleToggleTask}
                                />
                            ))}
                        </div>
                        
                    </div>
                        </div>


            </div>


            {/* Pop-Up Section */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg">



                        <div>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold">Add Task</h2>
                                    <p className="text-sm text-gray-600">
                                        Create a new task for your study planner
                                    </p>
                                </div>

                                <button
                                    onClick={() => setIsTaskModalOpen(false)}
                                    className="text-gray-500 hover:text-gray-900"
                                >
                                    ✕
                                </button>
                            </div>


                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                                <div className="lg:col-span-5">
                                    <div className="mt-6 space-y-4">
                                        <div>
                                            <label className="text-sm font-medium">Class</label>
                                            <select
                                                value={selectedClassId}
                                                onChange={(e) => setSelectedClassId(e.target.value)}
                                                className="mt-1 w-full rounded-lg border px-3 py-2"
                                            >
                                                <option value="">Select a class</option>

                                                {classes.map((classItem) => (
                                                    <option key={classItem.id} value={classItem.id}>
                                                        {classItem.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="text-sm font-medium">Task Title</label>
                                            <input
                                                type="title"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="mt-1 w-full rounded-lg border px-3 py-2"
                                                placeholder="Example: Review Chapter 4"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium">Select Importance</label>
                                            <select 
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value)}
                                                className="mt-1 w-full rounded-lg border px-3 py-2">
                                                <option value="low">Low - Small assignment (homework, discussion)</option>
                                                <option value="medium">Medium - Quiz or regular assignment</option>
                                                <option value="high">High - Major Assignment or test</option>
                                                <option value="critical">Critical - Must do well to pass</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                
                                <div className="lg:col-span-7">
                                    <div className="mt-6">
                                        <label className="text-sm font-medium">Due Date</label>
                                        <div className="rounded-xl border p-4">
                                            <div className="flex items-center justify-between">
                                                <Button variant="outline" size="sm" onClick={goToPreviousMonthModal}>Prev</Button>
                                                <p className="font-medium">{modalMonthTitle}</p>
                                                <Button variant="outline" size="sm" onClick={goToNextMonthModal}>Next</Button>
                                            </div>

                                            {/* Calendar Grid */}
                                            <div className="mt-4 grid grid-cols-7 gap-2 text-center">

                                                {/* Weekdays */}
                                                {weekDays.map((day) => (
                                                    <div key={day} className="text-sm text-gray-500">
                                                        {day}
                                                    </div>
                                                ))}

                                                {/* Calendar Days */}
                                                {modalCalendarDays.map((date, index) => (
                                                    <Button 
                                                        key={index}
                                                        onClick={() => { 
                                                            setModalSelectedDate(date.date);
                                                            setModalCurrentMonth(new Date(date.date.getFullYear(), date.date.getMonth(), 1));
                                                        }}
                                                        className={`rounded-lg py-2 text-sm bg-white border transition ${
                                                            isSameDay(date.date, modalSelectedDate)
                                                                ? "bg-blue-600 text-white border-blue-600"
                                                                : date.isCurrentMonth
                                                            ? "text-gray-900 hover:bg-gray-100"
                                                            : "text-gray-400 hover:bg-gray-100"
                                                        }`}
                                                    >
                                                        {date.day}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsTaskModalOpen(false)}
                                >
                                    Cancel
                                </Button>

                                <Button onClick={handleAddTask}>
                                    Save Task
                                </Button>
                            </div>


                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
