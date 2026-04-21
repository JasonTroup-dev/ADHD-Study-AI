"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link"

type FlashcardSet = {
  id: string;
  title: string;
  created_at: string;
};

export default function Flashcards() {

    const [flashcardSets, setflashcardSets] = useState<FlashcardSet[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    async function fetchSets(currentUserId: string) {
        const { data, error } = await supabase
            .from("flashcard_sets")
            .select("id, title, created_at")
            .eq("user_id", currentUserId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching flashcard sets:", error);
            return;
        }

        setflashcardSets(data ??[]);
    }

    useEffect(() => {
        async function loadPage() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            setUserId(user.id);
            await fetchSets(user.id);
        }

        loadPage();
    }, []);

    function buttonClick () {
        console.log("userId:", userId);
        console.log("flashcardSets:", flashcardSets);
    }

    return (
        <div className="flex flex-1 overflow-y-auto h-full w-full border border-green-500">
            <div className="flex-1 mt-16 mx-32 border border-pink-400">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="mb-2 text-4xl">Flashcards</h1>
                        <h2 className="text-gray-600">Review and master your study material</h2>
                    </div>

                    <Button asChild variant="default" size="lg" onClick={buttonClick} className="mt-8 px-5">
                        <Link href="/study/flashcards/create">
                            + New Set
                        </Link>
                    </Button>
                </div>
                
                <div className="mt-8 bg-gray-400 rounded-2xl flex flex-row border border-b-blue-400">
                    <div className="flex flex-1 flex-row m-8 border border-b-red-500">
                        <div>
                            <h1>
                                Image Area
                            </h1>
                        </div>
                        <div className="border border-b-blue-500">
                            <h1 className="text-xl">
                                AI-Powered Flashcard Generation
                            </h1>
                            <h2>
                                Paste your notes or study material and AI will automatically create flashcards for you!
                            </h2>
                            <Button variant="outline" size="sm" onClick={buttonClick}>
                                Generate from Text    
                            </Button>
                        </div>    
                    </div>
                </div>

                <div className="mt-8 border border-b-blue-600">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {flashcardSets.map((flashcardSet) => (
                        <Link
                            key={flashcardSet.id}
                            href={`/study/flashcards/${flashcardSet.id}`}
                            className="rounded-2xl border border-gray-200 bg-white p-6 min-h-60 flex flex-col justify-between shadow-sm"
                            >
                            <div className="flex items-start justify-between">
                                <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white text-lg font-semibold">
                                    F
                                </div>

                                <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                                    0 cards
                                </div>
                            </div>

                            <div className="mt-6">
                                <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                                    {flashcardSet.title}
                                </h3>

                                <p className="mt-2 text-sm text-gray-500">
                                    No description yet
                                </p>
                            </div>

                            <div className="mt-6">
                                <div className="flex items-center justify-between text-sm text-gray-600">
                                    <span>Progress</span>
                                    <span className="font-medium text-gray-900">0%</span>
                                </div>

                                <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                                    <div className="h-full w-[0%] bg-black rounded-full" />
                                </div>

                                <p className="mt-3 text-sm text-gray-500">
                                    0 mastered • 0 to review
                                </p>
                            </div>
                        </Link>
                    ))}
                    </div>
                </div>

            </div>
        </div>
    )
}