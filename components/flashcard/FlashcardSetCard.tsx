"use client";

import Link from "next/link";
import { BookOpen, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { getClassColor } from "@/lib/classColors";

type FlashcardSetCardProps = {
    id: string;
    title: string;
    classColor?: string | null;
    onDelete: (id: string, title: string) => void;
};

export default function FlashcardSetCard({
    id,
    title,
    classColor,
    onDelete,
}: FlashcardSetCardProps) {
    const color = getClassColor(classColor);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="relative rounded-2xl border border-gray-200 bg-white p-6 min-h-60 flex flex-col justify-between shadow-sm hover:shadow-lg">
            <Link
                href={`/study/flashcards/${id}`}
                className="absolute inset-0 z-0 rounded-2xl"
                aria-label={`Open ${title}`}
            />

            <div className="relative z-10 flex items-start justify-between">
                <div className={`h-12 w-12 rounded-xl ${color.accent} flex items-center justify-center text-white text-lg font-semibold`}>
                    <BookOpen />
                </div>

                <div className="relative flex items-center">
                    <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        0 cards
                    </div>

                    <button
                        type="button"
                        className="ml-2 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => {
                            setMenuOpen((prev) => !prev);
                        }}
                    >
                        <MoreVertical className="h-5 w-5" />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-8 z-30 w-36 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => {
                                    setMenuOpen(false);
                                    // edit logic here
                                }}
                            >
                                <Pencil className="h-4 w-4" />
                                Edit set
                            </button>

                            <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                onClick={() => {
                                    setMenuOpen(false);
                                    onDelete(id, title);
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete set
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative z-10 mt-6 pointer-events-none">
                <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                    {title}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                    No description yet
                </p>
            </div>

            <div className="relative z-10 mt-6 pointer-events-none">
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
        </div>
    );
}