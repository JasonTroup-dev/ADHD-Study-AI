"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import FlashcardSetCard from "@/components/flashcard/FlashcardSetCard";
import FlashcardGenerationBanner from "@/components/flashcard/FlashcardGenerationBanner";


type FlashcardSet = {
  id: string;
  title: string;
  created_at: string;
  class_id: string | null;
  classColor: string | null;
};

export default function Flashcards() {

    const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    async function fetchSets(currentUserId: string) {
        const { data: sets, error: setsError } = await supabase
            .from("flashcard_sets")
            .select("id, title, created_at, class_id")
            .eq("user_id", currentUserId)
            .order("created_at", { ascending: false });

        if (setsError) {
            console.error("Error fetching flashcard sets:", setsError);
            return;
        }

        const classIds = [...new Set((sets ?? []).map((set) => set.class_id).filter(Boolean))];

        const { data: classes, error: classesError } = await supabase
            .from("classes")
            .select("id, color")
            .in("id", classIds);
        
        if (classesError) {
            console.error("Error fetching classes:", classesError);
            return;
        }

        const classColorById = new Map(
            (classes ?? []).map((classItem) => [classItem.id, classItem.color])
        );

        const setsWithColors = (sets ?? []).map((set) => ({
            ...set,
            classColor: set.class_id ? classColorById.get(set.class_id) ?? null : null,
        }));

        setFlashcardSets(setsWithColors);
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

    async function handleDeleteSet(setId: string, title: string) {
        if (!userId) {
            alert("You must be logged in to delete a set.");
            return;
        }

        const confirmed = window.confirm(
            `Delete "${title}"? This will also delete the flashcards inside this set.`
        );

        if (!confirmed) return;

        const { data, error } = await supabase
            .from("flashcard_sets")
            .delete()
            .eq("id", setId)
            .eq("user_id", userId)
            .select("id");

        if (error) {
            console.error("Error deleting flashcard set:", error);
            alert("Could not delete this flashcard set.");
            return;
        }

        if (!data || data.length === 0) {
            console.error("No rows deleted. Possible RLS/user_id mismatch.");
            alert("No set was deleted. Check RLS or user ownership.");
            return;
        }

        setFlashcardSets((prev) => prev.filter((set) => set.id !== setId));
    }

    return (
        <div className="min-h-screen w-full bg-gray-100">
            <div className="mx-auto w-full max-w-screen-2xl px-6 py-8 lg:px-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-semibold">Flashcards</h1>
                        <h2 className="text-xl py-2 text-gray-600">Review and master your study material</h2>
                    </div>

                    <Button asChild variant="default" size="lg" className="mt-8 px-5">
                        <Link href="/study/flashcards/create">
                            + New Set
                        </Link>
                    </Button>
                </div>
                

                {/* AI Flashcard Generation Card */}
                <FlashcardGenerationBanner
                    onGenerateClick={() => {
                        window.location.href = "/study/flashcards/create?mode=ai";
                    }}
                />

                <div className="mt-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {flashcardSets.map((flashcardSet) => (
                        <FlashcardSetCard
                            key={flashcardSet.id}
                            id={flashcardSet.id}
                            title={flashcardSet.title}
                            classColor={flashcardSet.classColor}
                            onDelete={handleDeleteSet}
                        />
                    ))}
                    </div>
                </div>

            </div>
        </div>
    )
}