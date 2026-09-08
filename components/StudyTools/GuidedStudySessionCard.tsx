"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";
import { supabase } from "@/lib/supabase/client";
import {
    DEFAULT_STUDY_PREFERENCES,
    getStudyPreferences,
    type StudyPreferences,
} from "@/lib/userSettings";

export default function GuidedStudySessionCard() {
    const [preferences, setPreferences] = useState<StudyPreferences>(
        DEFAULT_STUDY_PREFERENCES,
    );

    useEffect(() => {
        let isActive = true;

        async function loadPreferences() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (isActive && user) {
                setPreferences(getStudyPreferences(user.user_metadata));
            }
        }

        void loadPreferences();

        return () => {
            isActive = false;
        };
    }, []);

    return (
        <div className="workspace-card workspace-card-gold workspace-card-interactive flex min-h-60 flex-col justify-between p-6 lg:col-span-6">
            <div className="flex">
                <div className="flex size-15 items-center justify-center rounded-2xl bg-[#fffaf0]">
                    <Timer className="text-[#4d765f]"/>
                </div>
                <div className="ml-4">
                    <header className="text-2xl font-semibold">Guided Study Session</header>
                    <p>Choose one task, start the timer, and take the first small step</p>
                </div>
            </div>

            <div>
                <div className="workspace-inset my-4">
                    <div className="min-h-25 flex flex-col justify-center items-center">
                        <header className="text-4xl font-semibold">
                            {preferences.focusMinutes}:00
                        </header>
                        <p className="text-sm text-gray-500">Planned study time</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="inline-flex rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600">
                        <p>Study Session</p>
                    </div>

                    {preferences.breakReminders ? (
                        <div className="inline-flex rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600">
                            <p>Break Reminder</p>
                        </div>
                    ) : null}
                </div>

                <StartStudySessionButton
                    title="General study session"
                    plannedMinutes={preferences.focusMinutes}
                    sessionType="general_study"
                    className="mt-4 w-full"
                />
            </div>
        </div>
    )
}
