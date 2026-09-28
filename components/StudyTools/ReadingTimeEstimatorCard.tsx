import { Button } from "../ui/button"
import { BookOpen } from "lucide-react"

export default function ReadingTimeEstimatorCard() {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 min-h-60 flex flex-col justify-between shadow-sm hover:shadow-xl lg:col-span-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100">
                <BookOpen className="text-blue-500"/>
            </div>
            <div className="my-4"> 
                <header className="text-lg font-semibold">Reading Time Estimator</header>
                <p className="text-gray-600">Estimate reading difficulty and suggested study time</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-100 p-2 px-4 my-4">
                <div className="flex justify-between items-center">
                    <p className="text-gray-600">Estimated time</p>
                    <p className="font-semibold">~45 min</p>
                </div>

                <div className="flex justify-between items-center">
                    <p className="text-gray-600">Difficulty</p>
                    <div className="rounded-lg border border-gray-200 bg-gray-200 p-1 px-2">
                        <p className="font-semibold">Medium</p>
                    </div>
                </div>
            </div>

            <Button
                variant="outline"
                className="font-semibold text-md"
            >
                Estimate Reading Time
            </Button>
        </div>
    )
}