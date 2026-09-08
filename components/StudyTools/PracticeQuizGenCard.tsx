import { FileQuestionMark, Play } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function PracticeQuizGenCard() {
    return (
        <div className="workspace-card workspace-card-coral workspace-card-interactive flex min-h-60 flex-col justify-between p-6 lg:col-span-6">
            <div className="flex">
                <div className="flex size-15 items-center justify-center rounded-2xl bg-[#fffaf0] text-[#9e3f28]">
                    <FileQuestionMark />
                </div>
                <div className="ml-4">
                    <header className="text-2xl font-semibold">Practice Quiz Generator</header>
                    <p>Turn study material into interactive quizzes with instant feedback</p>
                </div>
            </div>

            <div>
                <div className="flex gap-2">
                    <div className="inline-flex rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600">
                        <p>Multiple Choice</p>
                    </div>

                    <div className="inline-flex rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600">
                        <p>Short Answer</p>
                    </div>

                    <div className="inline-flex rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600">
                        <p>Instant Feedback</p>
                    </div>
                </div>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                    <Link href="/study/practice-quiz">
                        <Play aria-hidden="true" />
                        Get Started
                    </Link>
                </Button>
            </div>
        </div>
    );
}
