import { Astroid } from "lucide-react";
import { Button } from "../ui/button";

type FlashcardGenerationBannerProps = {
    onGenerateClick: () => void;
};


export default function FlashcardGenerationBanner({ onGenerateClick, }: FlashcardGenerationBannerProps) {
    return (
        <div className="my-8 bg-linear-to-r from-blue-200 to-purple-200 rounded-2xl flex flex-row border border-purple-400">
            <div className="flex flex-1 flex-row m-8">
                <div>
                    <Astroid className="mt-1 mr-2 text-purple-900 font-semibold"/>
                </div>

                <div>
                    <h1 className="text-2xl font-semibold text-purple-900">
                        AI-Powered Flashcard Generation
                    </h1>
                    <h2 className="my-1 mb-2 text-lg text-purple-800">
                        Upload a study document and AI will automatically create flashcards for you!
                    </h2>
                    <Button variant="outline" size="lg" onClick={onGenerateClick} className="flex items-center text-base border border-purple-400">
                            <Astroid className="mr-2"/>
                            <p>Generate from File</p>
                    </Button>
                </div>    
            </div>
        </div>
    )
}
