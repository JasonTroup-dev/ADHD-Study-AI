import { FileQuestionMark } from "lucide-react"
import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";

export default function PracticeQuizGenCard() {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 min-h-60 flex flex-col justify-between shadow-sm hover:shadow-xl lg:col-span-6">
            <div className="flex">
                <div className="flex items-center justify-center w-15 h-15 rounded-xl bg-blue-100">
                    <FileQuestionMark className="text-blue-700"/>
                </div>
                <div className="ml-4">
                    <header className="text-2xl font-semibold">Practice Quiz Generator</header>
                    <p>Turn study material into interactive quizzes with isntant feedback</p>
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
                <StartStudySessionButton
                    title="Practice quiz"
                    sessionType="practice_quiz"
                    className="mt-4 w-full"
                />
            </div>
        </div>
    )
}
