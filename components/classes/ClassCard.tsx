import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Clock3, Trash2 } from "lucide-react";
import { getClassColor, type ClassColor } from "@/lib/classColors";

type ClassCardProps = {
  id: string;
  name: string;
  classCode: string;
  professorName: string;
  color: ClassColor;
  onDelete: (id:string, name:string) => void;
};


export default function ClassCard({
    id,
    name,
    classCode,
    professorName,
    color,
    onDelete,
}: ClassCardProps) {
    const colorOption = getClassColor(color);

    return (
        <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg lg:col-span-4">
            <span aria-hidden="true" className={`absolute left-0 top-0 h-full w-1.5 ${colorOption.accent}`}/>
            <div className="flex justify-between items-center">
                <header className="text-xl font-semibold">{name}</header>
                
                <Trash2
                className="ml-2 h-5 w-5 cursor-pointer text-gray-500 hover:text-red-600"
                onClick={() => onDelete(id, name)}
                />
            </div>

            <div className="flex">
                {classCode}
                <p className="mx-2">*</p>
                {professorName}
            </div>

            <div className={`my-6 rounded-2xl ${colorOption.bg} px-4 py-4`}>

                <div className="flex items-center gap-2">
                <Clock3 className={`h-4 w-4 ${colorOption.icon}`} />

                <p className="text-lg font-semibold text-black">
                Problem Set 7
                </p>
                </div>

                <p className="pl-6 text-sm text-gray-600">
                Due May 15
                </p>

            </div>

            <div className="">
                <div className="flex justify-between">
                <p>Course Progress</p>
                <p className="font-semibold">68%</p>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-300">
                <div 
                    className="h-full rounded-full bg-black"
                    style={{ width: `68%` }}>
                </div>
                </div>

                <div className="my-6 h-px w-full bg-gray-300"></div>

                <div>
                <div className="flex divide-x divide-gray-200">
                    <div className="flex-1 text-center">
                    <p className="font-bold">45</p>
                    <p>Flashcard Sets</p>
                    </div>
                    <div className="flex-1 text-center">
                    <p className="font-bold">12</p>
                    <p>Notes</p>
                    </div>
                    <div className="flex-1 text-center">
                    <p className="font-bold">8</p>
                    <p>Sessions</p>
                    </div>
                </div>
                </div>
            </div>

            <div className="mt-auto flex justify-center pt-6">
                <Link 
                href={`/classes/${id}`}
                className="w-full">
                <Button 
                    variant="ghost" 
                    size="default"
                    className="w-full border"
                    >
                    Continue Studying
                </Button>
                </Link>
            </div>
        </div>
    )
}