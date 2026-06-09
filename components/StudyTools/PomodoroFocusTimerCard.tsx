import { Button } from "../ui/button"
import { Timer, ArrowRight } from "lucide-react"

export default function PomodoroFocusTimerCard() {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 min-h-60 flex flex-col justify-between shadow-sm hover:shadow-xl lg:col-span-6">
            <div className="flex">
                <div className="flex items-center justify-center w-15 h-15 rounded-xl bg-green-100">
                    <Timer className="text-green-700"/>
                </div>
                <div className="ml-4">
                    <header className="text-2xl font-semibold">Pomodoro Focus Timer</header>
                    <p>Stay focused without burnout using structured study sessions</p>
                </div>
            </div>

            <div>
                <div className="rounded-2xl border border-green-300 bg-white my-4">
                    <div className="min-h-25 flex flex-col justify-center items-center">
                        <header className="text-4xl font-semibold">25:00</header>
                        <p className="text-sm text-gray-500">Focus Session</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="inline-flex rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600">
                        <p>Focus Session</p>
                    </div>

                    <div className="inline-flex rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600">
                        <p>Break Reminder</p>
                    </div>
                </div>

                <Button 
                    variant="default"
                    size="lg"
                    className="w-full bg-white mt-4 text-black border border-green-300"
                >
                    Create Quiz
                    <ArrowRight />
                </Button>
            </div>
        </div>
    )
}