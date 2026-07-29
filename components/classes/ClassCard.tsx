import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { getClassColor, type ClassColor } from "@/lib/classColors";

type ClassCardProps = {
  id: string;
  name: string;
  classCode: string;
  professorName: string;
  color: ClassColor;
  nextAssignment: {
    id: string;
    title: string;
    dueDate: string | null;
  } | null;
  progressPercent: number;
  flashcardSetCount: number;
  noteCount: number;
  sessionCount: number;
};


export default function ClassCard({
    id,
    name,
    classCode,
    professorName,
    color,
    nextAssignment,
    progressPercent,
    flashcardSetCount,
    noteCount,
    sessionCount,
}: ClassCardProps) {
    const colorOption = getClassColor(color);

    return (
        <Link
          href={`/classes/${id}`}
          aria-label={`Open ${name} class workspace`}
          className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:col-span-4"
        >
            <span aria-hidden="true" className={`absolute left-0 top-0 h-full w-1.5 ${colorOption.accent}`}/>
            <h2 className="text-xl font-semibold">{name}</h2>

            <div className="flex">
                {classCode}
                <p className="mx-2">*</p>
                {professorName}
            </div>

            <div className={`my-6 rounded-2xl ${colorOption.bg} px-4 py-4`}>

                {nextAssignment ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Clock3
                        className={`h-4 w-4 ${colorOption.icon}`}
                        aria-hidden="true"
                      />
                      <p className="truncate text-lg font-semibold text-black">
                        {nextAssignment.title}
                      </p>
                    </div>
                    <p className="pl-6 text-sm text-gray-600">
                      {formatDueDate(nextAssignment.dueDate)}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`h-4 w-4 ${colorOption.icon}`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-black">
                        You&apos;re caught up
                      </p>
                      <p className="text-sm text-gray-600">No open assignments</p>
                    </div>
                  </div>
                )}

            </div>

            <div className="">
                <div className="flex justify-between">
                <p>Course Progress</p>
                <p className="font-semibold">{progressPercent}%</p>
                </div>
                <div
                  className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-300"
                  role="progressbar"
                  aria-label={`${name} course progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercent}
                >
                <div 
                    className="h-full rounded-full bg-black"
                    style={{
                      width: `${Math.min(Math.max(progressPercent, 0), 100)}%`,
                    }}>
                </div>
                </div>

                <div className="my-6 h-px w-full bg-gray-300"></div>

                <div>
                <div className="flex divide-x divide-gray-200">
                    <div className="flex-1 text-center">
                    <p className="font-bold">{flashcardSetCount}</p>
                    <p>Flashcard Sets</p>
                    </div>
                    <div className="flex-1 text-center">
                    <p className="font-bold">{noteCount}</p>
                    <p>Notes</p>
                    </div>
                    <div className="flex-1 text-center">
                    <p className="font-bold">{sessionCount}</p>
                    <p>Sessions</p>
                    </div>
                </div>
                </div>
            </div>
        </Link>
    )
}

function formatDueDate(dueDate: string | null) {
  if (!dueDate) return "No due date";

  const parsedDate = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return "Due date unavailable";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const differenceInDays = Math.round(
    (parsedDate.getTime() - today.getTime()) / 86_400_000,
  );

  if (differenceInDays === 0) return "Due today";
  if (differenceInDays === 1) return "Due tomorrow";

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsedDate);

  return differenceInDays < 0
    ? `Overdue · ${formattedDate}`
    : `Due ${formattedDate}`;
}
