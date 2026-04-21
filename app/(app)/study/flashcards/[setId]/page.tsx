import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link"

type FlashcardSetPageProps = {
    params: Promise<{
        setId: string;
    }>;
};

export type FlashcardItem = {
    id: string,
    question: string,
    answer: string,
    card_order: number;
};

export default async function FlashcardSetPage({params,}: FlashcardSetPageProps) {

    const { setId } = await params;
    const supabase = await createClient();

    const { data: flashcardSet, error: setError } = await supabase
        .from("flashcard_sets")
        .select("id, title")
        .eq("id", setId)
        .single()
    
    return (
            <div className="flex h-full w-full justify-center bg-gray-100">
                <div className="flex h-full w-8/12 border border-b-blue-500">
                    <div className="border border-b-red-500">
                        <Link href="/study/flashcards">
                            <Button variant="ghost" size="default">{"← Back"}</Button>
                        </Link>
                    </div>
                    <div>

                    </div>
                </div>
            </div>
    );
}