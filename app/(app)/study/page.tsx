import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import AIStudyGuideGenBanner from "@/components/StudyTools/AIStudyGuideGenBanner";
import PracticeQuizGenCard from "@/components/StudyTools/PracticeQuizGenCard";
import GuidedStudySessionCard from "@/components/StudyTools/GuidedStudySessionCard";
import AssignmentBreakdownCard from "@/components/StudyTools/AssignmentBreakdownCard";
import ComingSoonOverlay from "@/components/StudyTools/ComingSoonOverlay";

export default function StudyTools() {
    return (
        <div className="min-h-screen w-full bg-gray-100">
            <div className="mx-auto w-full max-w-screen-xl px-6 py-8 lg:px-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-semibold">Study Tools</h1>
                        <h2 className="text-xl py-2 text-gray-600">Tools to help you learn, practice, and stay organized</h2>
                    </div>
                </div>

                <div className="flex justify-between items-center w-full my-8">
                    <div className="my-6 h-px w-5/12 bg-gray-300" />
                    <p className="text-gray-400 font-semibold">FEATURED TOOLS</p>
                    <div className="my-6 h-px w-5/12 bg-gray-300" />
                </div>

                <AIStudyGuideGenBanner />


                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                    <PracticeQuizGenCard />

                    <GuidedStudySessionCard />
                </div>


                <div className="flex justify-between items-center w-full my-8">
                    <div className="my-6 h-px w-5/12 bg-gray-300" />
                    <p className="text-gray-400 font-semibold">Utility Tools</p>
                    <div className="my-6 h-px w-5/12 bg-gray-300" />
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                    <AssignmentBreakdownCard />

                    <div
                        className="relative isolate cursor-not-allowed overflow-hidden rounded-2xl border border-gray-300 bg-gray-50 p-6 min-h-60 flex flex-col justify-between shadow-sm grayscale lg:col-span-4"
                        aria-disabled="true"
                    >
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
                            disabled
                        >
                            Estimate Reading Time
                        </Button>

                        <ComingSoonOverlay />
                    </div>

                    <div
                        className="relative isolate cursor-not-allowed overflow-hidden rounded-2xl border border-gray-300 bg-gray-50 p-6 min-h-60 flex flex-col justify-between shadow-sm grayscale lg:col-span-4"
                        aria-disabled="true"
                    >
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100">
                            <BookOpen className="text-gray-500"/>
                        </div>
                        <div className="my-4"> 
                            <header className="text-lg font-semibold">Study Mode</header>
                            <p className="text-gray-600">Simplify your workspace for deep, distraction-free studying</p>
                        </div>

                        <div className="rounded-2xl border border-dashed border-gray-400 bg-gray-100 p-2 my-4 flex justify-center items-center h-15">
                            <p>Minimal distraction view</p>
                            
                        </div>

                        <Button
                            variant="outline"
                            className="font-semibold text-md"
                            disabled
                        >
                            Enter Study Mode
                        </Button>

                        <ComingSoonOverlay />
                    </div>
                </div>
            </div>

        </div>
    );
}
