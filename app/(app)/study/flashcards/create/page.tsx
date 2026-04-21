"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Plus } from "lucide-react";

type FlashcardItem = {
    id: string;
    question: string;
    answer: string;
    card_order: number;
};

export default function FlashcardsCreate() {

    const [setTitle, setSetTitle] = useState("");
    const[flashcards, setFlashcards] = useState<FlashcardItem[]>([
        {
            id: crypto.randomUUID(),
            question: "",
            answer: "",
            card_order: 1,
        },
    ]);

    const[userId, setUserId] = useState<string | null>(null);

    function addCard() {
        setFlashcards((prevFlashcards) => [
            ...prevFlashcards, 
            {id: crypto.randomUUID(), 
                question: "", 
                answer: "",
                card_order: prevFlashcards.length + 1,
            },
        ]);
    }

    function updateFlashcard(
        id: string,
        field: "question" | "answer",
        value: string,
    ) {
        setFlashcards((prevFlashcards) => 
            prevFlashcards.map((flashcard) => 
                flashcard.id === id 
                    ? {...flashcard, [field]: value }
                    : flashcard
            )
        );
    }

    async function createFlashcardSet () {
        if (!userId) return;

        const trimmedSetTitle = setTitle.trim();
        if (!trimmedSetTitle) return;
        
        const validFlashcards = flashcards.filter(
            (flashcard) =>
                flashcard.question.trim() !== "" &&
                flashcard.answer.trim() !== ""
        );

        if (validFlashcards.length === 0) {
            return;
        }

        const { data, error } = await supabase.from("flashcard_sets").insert({
            user_id: userId,
            title: trimmedSetTitle,
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding Flashcard Set:", error);
            return;
        }

        const setId = data.id;

        const flashcardRows = validFlashcards.map((flashcard, index) => ({
            set_id: setId,
            question: flashcard.question.trim(),
            answer: flashcard.answer.trim(),
            card_order: index + 1,
        }));

        const { error: flashcardsError } = await supabase
            .from("flashcards")
            .insert(flashcardRows);

        if (flashcardsError) {
            await supabase.from("flashcard_sets").delete().eq("id", setId);
            console.error("Error adding flashcards:", flashcardsError);
            return;
        }
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

    return (
        <div className="h-full w-full overflow-y-auto flex justify-center bg-gray-100">
            <div className="w-6/12 border border-green-400">

                { /*Page Title Area*/ }
                <div className="mt-4 border border-b-blue-600">
                    <h1 className="my-2 text-3xl">
                        Create Flashcard Set
                    </h1>
                    <p className="text-gray-700">
                        Build your study set manually
                    </p>
                </div>

                { /* Flashcard Title and Class */ }
                <div className="my-8 p-8 rounded-md border border-amber-600 bg-white">
                    <p>
                        Set Title
                    </p>

                    <input
                        placeholder="e.g., Spanish Vocabulary Chapter 3"
                        className="w-full rounded-md border p-2 bg-gray-200"
                        value={setTitle}
                        onChange={(e) => setSetTitle(e.target.value)}
                    />

                    <p>
                        Class (Optional) FIX ME!!!
                    </p>

                    <input
                        placeholder="Select a class"
                        className="w-full rounded-md border p-2 bg-gray-200"
                    />
                </div>

                { /* Flashcard Start Div */ }
                <div className="flex justify-between">
                    <div>
                        <h2 className="text-2xl">
                            Flashcards
                        </h2>
                        <p className="text-gray-700">
                            {flashcards.length} Cards
                        </p>
                    </div>

                    <div className="flex items-center">
                        <Button variant="default" size="default" onClick={addCard}>
                            + Add Card
                        </Button>
                    </div>
                </div>

                <hr className="border-gray-300 my-6" />

                { /* Flashcard Area */}
                <div>
                    {flashcards.map((flashcardItem, index) => (

                        <div
                        key={flashcardItem.id} 
                        className="mb-8 p-8 rounded-md border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-shadow duration-200"
                        >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-300">
                                {index + 1}
                            </div>

                            <p>
                                Question
                            </p>

                            <textarea
                                placeholder="Enter the question or term..."
                                className="w-full rounded-md border p-3 align-top bg-gray-200 resize-none"
                                value={flashcardItem.question}
                                onChange={(e) =>
                                    updateFlashcard(flashcardItem.id, "question", e.target.value)
                                }
                            />

                            <p>
                                Answer
                            </p>

                            <textarea
                                placeholder="Enter the answer or definition..."
                                className="w-full rounded-md border p-3 align-top bg-gray-200 resize-none"
                                value={flashcardItem.answer}
                                onChange={(e) =>
                                    updateFlashcard(flashcardItem.id, "answer", e.target.value)
                                }
                            />
                        </div>

                    ))}
                </div>

                <Button
                    onClick={addCard}
                    className="w-full h-16 border-2 border-dashed border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900 flex items-center justify-center gap-2 transition"
                >
                    <Plus className="w-5 h-5" />
                    Add Another Card
                </Button>

                <div className="w-full flex justify-end pt-4">

                    {/* Temp
                    <Button variant="default" size="default" onClick={createFlashcardSet}>
                        Save Set
                    </Button>
                     */}

                    <Button variant="default" size="default" onClick={createFlashcardSet}>
                        Save Set
                    </Button>
                </div>

                <div className="border-t border-gray-300 my-6"></div>
            </div>

        </div>
    );
}