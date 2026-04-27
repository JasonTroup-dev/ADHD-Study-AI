"use client"

import { getCalendarDays } from "./lib/getCalendarDays";
import { Button } from "@/components/ui/button";
import { useState } from "react";


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

    const [isModalOpen, setIsModalOpen] = useState(false);

    function goToPreviousMonth() {
        setCurrentMonth((prev) => {
            return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
        });
    }

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
                        <p className="text-lg text-gray-600">1 of 2 tasks completed</p>
                        <p className="text-xl font-semibold">50%</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/70">
                        <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
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
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 lg:col-span-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">{ formattedDate }</h2>
                                <p className="text-gray-600">2 tasks scheduled</p>
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
                        <div className="mt-8 space-y-4">
                            <div className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
                                <div className="flex items-start gap-4">
                                    <input type="checkbox" className="mt-1"/>
                                        <div>
                                            <h3 className="font-semibold">Review Calculus Chapter 5</h3>
                                            <p className="mt-2 text-sm text-gray-600">45 min · Mathematics</p>
                                        </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
                                        high
                                    </span>

                                    <div className="h-5 w-5 rounded-full border border-gray-300"/>

                                </div>
                            </div>
                        </div>

                        
                    </div>
                </div>
            </div>


            {/* Pop-Up Section */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
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

                        <div className="mt-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium">Task Title</label>
                                <input
                                    className="mt-1 w-full rounded-lg border px-3 py-2"
                                    placeholder="Example: Review Chapter 4"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium">Estimated Time</label>
                                <input
                                    className="mt-1 w-full rounded-lg border px-3 py-2"
                                    placeholder="Example: 45 minutes"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium">Select Importance</label>
                                <select className="mt-1 w-full rounded-lg border px-3 py-2">
                                    <option value="low">Low - Small assignment (homework, discussion)</option>
                                    <option value="medium">Medium - Quiz or regular assignment</option>
                                    <option value="high">High - Major Assignment or test</option>
                                    <option value="critical">Critical - Must do well to pass</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </Button>

                                <Button>
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