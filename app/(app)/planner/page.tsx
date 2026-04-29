"use client"

import { getCalendarDays } from "./lib/getCalendarDays";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";


type ClassItem = {
    id: string,
    name: string;
};

type StudyTask = {
    id: string;
    title: string;
    estimated_minutes: number | null;
    priority: string;
    status: string;
    scheduled_date: string;
    classes: {
        name: string;
    }[] | null;
}

export default function Page() {

    { /* Calendar Variables */}
    const weekDays= ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const calendarDays = getCalendarDays(currentMonth);
    const formattedDate = selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
    const monthTitle = currentMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
    
    function goToNextMonth() {
        setCurrentMonth((prev) => {
            return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
        });
    }

    function isSameDay(dateOne: Date, dateTwo: Date) {
        return (
            dateOne.getFullYear() === dateTwo.getFullYear() &&
            dateOne.getMonth() === dateTwo.getMonth() &&
            dateOne.getDate() === dateTwo.getDate()
        );
    }

    //Modal variables

    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState("low");
    const [selectedClassId, setSelectedClassId] = useState("");
    const [estimatedTime, setEstimatedTime] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);



    //Modal Calendar variables

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

    const selectedDateString = selectedDate.toISOString().split("T")[0];

    function goToPreviousMonth() {
        setCurrentMonth((prev) => {
            return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
        });
    }


    async function handleAddTask () {
        if (!userId) return;

        const classId = selectedClassId;
        const trimmedTaskTitle = title.trim();

        if (!trimmedTaskTitle == null) return;

        const trimmedEstimatedTime = estimatedTime.trim();

        if (!trimmedTaskTitle == null) return;

        const importance = priority;

        const scheduledDate = modalSelectedDate.toISOString().split("T")[0];

        const { error } = await supabase.from("study_plan_tasks").insert({
            user_id: userId,
            class_id: classId,
            title: trimmedTaskTitle,
            estimated_minutes: trimmedEstimatedTime ? Number(trimmedEstimatedTime) : null,
            priority: importance,
            status: "todo",
            scheduled_date: scheduledDate,

        });

        if (error) {
            console.error("Error adding task:", error);
            return;
        }

        setIsModalOpen(false);
        setTitle("");
        setEstimatedTime("");
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
                .select("id, name")
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

            const { data, error } = await supabase
            .from("study_plan_tasks")
            .select(`
                id,
                title,
                estimated_minutes,
                priority,
                status,
                scheduled_date,
                classes (
                name
                )
            `)
            .eq("user_id", userId)
            .eq("scheduled_date", selectedDateString)
            .order("created_at", { ascending: true });

            if (error) {
            console.error("Error loading tasks:", error);
            return;
            }

            setTasks(data ?? []);
        }

        loadTasks();
    }, [userId, selectedDateString]);


     //Prograss Bar Variables
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
                        <Button className="text-base" variant="default" size="lg">
                            Generate AI Study Plan
                        </Button>
                    </div>
                </div>

                {/* Progress Card */}
                <div className="mt-8 rounded-2xl border bg-gradient-to-r from-blue-100 to-indigo-200 p-8">
                    <h2 className="text-xl font-semibold">Todays Progress</h2>

                    <div className="flex justify-between mt-8">
                        <p className="text-lg text-gray-600">
                        {completedTasks} of {totalTasks} tasks completed
                        </p>

                        <p className="text-xl font-semibold">{progressPercent}%</p>
                    </div>

                    <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/70">
                        <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>


                {/* Main Section */}
                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                    
                    {/* Calendar Card */}
                    <div className="rounded-2xl bg-white p-6 lg:col-span-4">
                        <div>
                            <h2 className="text-xl font-semibold">Calendar</h2>
                            <p className="text-gray-600">Select a date to view tasks</p>
                        </div>

                
                        <div className="mt-6 rounded-xl border p-4">
                            <div className="flex items-center justify-between">
                                <Button variant="outline" size="sm" onClick={goToPreviousMonth}>Prev</Button>
                                <p className="font-medium">{monthTitle}</p>
                                <Button variant="outline" size="sm" onClick={goToNextMonth}>Next</Button>
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
                                {calendarDays.map((date, index) => (
                                    <Button 
                                        key={index}
                                        onClick={() => { 
                                            setSelectedDate(date.date);
                                            setCurrentMonth(new Date(date.date.getFullYear(), date.date.getMonth(), 1));
                                        }}
                                        className={`rounded-lg py-2 text-sm bg-white border transition ${
                                            isSameDay(date.date, selectedDate)
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

                        <div className="my-6 h-px w-full bg-gray-300"></div>
                    </div>


                    {/* Daily TODO Card */}
                    <div className="flex max-h-[55vh] flex-col rounded-2xl border border-gray-200 bg-white p-6 lg:col-span-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">{ formattedDate }</h2>
                                <p className="text-gray-600">{tasks.length} tasks scheduled</p>
                            </div>

                            <Button 
                                variant="default" 
                                size="default"
                                onClick={() => setIsModalOpen(true)}
                                >
                                    + Add Task
                            </Button>
                        </div>

                        {/* ToDo List Item Card */}
                        <div className="mt-8 flex-1 space-y-4 overflow-y-auto pr-2">
                            {tasks.map((task) => {
                                const isCompleted = task.status == "completed";

                                return (
                                    <div
                                        key={task.id}
                                        className={`flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 ${
                                            isCompleted ? "bg-gray-50 opacity-60" : "bg-white"
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <input
                                                type="checkbox"
                                                checked={isCompleted}
                                                onChange={() => handleToggleTask(task)}
                                                className="mt-1"
                                            />

                                            <div>
                                                <h3
                                                    className={`font-semibold ${
                                                        isCompleted ? "text-gray-500 line-through" : "text-gray-900"
                                                    }`}
                                                >
                                                    {task.title}
                                                </h3>


                                                <p className="mt-2 text-sm text-gray-600">
                                                    {task.estimated_minutes ?? 0} min * {task.classes?.[0]?.name ?? "No class"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
                                                {task.priority}
                                            </span>
                                            
                                            <div className="h-5 w-5 rounded-full border border-gray-300"/>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                    </div>
                </div>
            </div>


            {/* Pop-Up Section */}
            {isModalOpen && (
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
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-500 hover:text-gray-900"
                                >
                                    ✕
                                </button>
                            </div>


                            <div className="flex grid grid-cols-1 gap-6 lg:grid-cols-12">
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
                                            <label className="text-sm font-medium">Estimated Time</label>
                                            <input
                                                type="number"
                                                value={estimatedTime}
                                                onChange={(e) => setEstimatedTime(e.target.value)}
                                                className="mt-1 w-full rounded-lg border px-3 py-2"
                                                placeholder="Example: 45 minutes"
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
                                    onClick={() => setIsModalOpen(false)}
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