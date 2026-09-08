import { Astroid } from "lucide-react";
import { Button } from "../ui/button";

type FlashcardGenerationBannerProps = {
    onGenerateClick: () => void;
};


export default function FlashcardGenerationBanner({ onGenerateClick, }: FlashcardGenerationBannerProps) {
    return (
        <div className="workspace-card workspace-card-dark relative my-8 flex overflow-hidden p-6 sm:p-8">
            <div aria-hidden="true" className="absolute -right-10 -top-14 size-40 rounded-full bg-[#d76543]" />
            <div aria-hidden="true" className="absolute right-24 top-20 size-20 rounded-full bg-[#ddc56f]" />
            <div className="relative flex flex-1 flex-row">
                <div>
                    <Astroid className="mr-3 mt-1 shrink-0 text-[#ed9b79]"/>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#fffaf0]">
                        AI-Powered Flashcard Generation
                    </h2>
                    <p className="mb-3 mt-1 text-base text-[#c4cec8] sm:text-lg">
                        Upload a study document and AI will automatically create flashcards for you!
                    </p>
                    <Button variant="secondary" size="default" onClick={onGenerateClick} className="flex items-center bg-[#fffaf0] text-[#19241f] hover:bg-[#f3d7c9]">
                            <Astroid className="mr-2"/>
                            <p>Generate from File</p>
                    </Button>
                </div>    
            </div>
        </div>
    )
}
