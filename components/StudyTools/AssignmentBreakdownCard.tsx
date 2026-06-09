import { ListChecks } from "lucide-react"
import { Dot } from "lucide-react"
import { Button } from "../ui/button"

export default function AssignmentBreakdownCard() {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 min-h-60 flex flex-col justify-between shadow-sm hover:shadow-xl lg:col-span-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100">
                <ListChecks className="text-orange-500"/>
            </div>
            <div className="my-4"> 
                <header className="text-lg font-semibold">Assignment Breakdown</header>
                <p className="text-gray-600">Break overwhelming assignments into smaller, manageable steps</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-100 p-2 my-4">
                <div className="flex gap-1">
                    <Dot className="text-gray-600" />
                    <p className="text-gray-600">Research</p>
                </div>

                <div className="flex gap-1">
                    <Dot className="text-gray-600"/>
                    <p className="text-gray-600">Outline</p>
                </div>

                <div className="flex gap-1">
                    <Dot className="text-gray-600"/>
                    <p className="text-gray-600">Draft</p>
                </div>
            </div>

            <Button
                variant="outline"
                className="font-semibold text-md"
            >
                Break Down Assignment
            </Button>
        </div>
    )
}