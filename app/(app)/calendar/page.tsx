import React, { JSX } from "react";

export const metadata = {
    title: "Calendar",
};

export default function CalendarPage(): JSX.Element {
    return (
        <main className="p-8">
            <h1 className="text-2xl font-semibold mb-4">Calendar</h1>
            <div className="border rounded-lg p-6 text-sm text-gray-500">
                Placeholder calendar page. Replace with your calendar component.
            </div>
        </main>
    );
}