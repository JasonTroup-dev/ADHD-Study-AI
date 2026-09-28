import { Button } from "../ui/button";

type CalendarDay = {
    date: Date;
    day: number;
    isCurrentMonth: boolean;
};

type PlannerCalendarProps = {
    selectedDate: Date,
    currentMonth: Date,
    onSelectDate: (date: Date) => void;
    onChangeMonth: (date: Date) => void;
};


const weekDays= ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];


function isSameDay(dateOne: Date, dateTwo: Date) {
        return (
            dateOne.getFullYear() === dateTwo.getFullYear() &&
            dateOne.getMonth() === dateTwo.getMonth() &&
            dateOne.getDate() === dateTwo.getDate()
        );
    }


function getCalendarDays(currentMonth: Date): CalendarDay[] {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDay = firstDayOfMonth.getDay();

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPreviousMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    for (let i = startDay - 1; i >= 0; i--) {
        const day = daysInPreviousMonth - i;

        days.push({
        date: new Date(year, month - 1, day),
        day,
        isCurrentMonth: false,
        });
    }

    for (let day = 1; day <= daysInCurrentMonth; day++) {
        days.push({
        date: new Date(year, month, day),
        day,
        isCurrentMonth: true,
        });
    }

    const remainingDays = 35 - days.length;

    for (let day = 1; day <= remainingDays; day++) {
        days.push({
        date: new Date(year, month + 1, day),
        day,
        isCurrentMonth: false,
        });
    }

    return days;
}


export default function PlannerCalendar({
    selectedDate,
    currentMonth,
    onSelectDate,
    onChangeMonth,
}: PlannerCalendarProps) {
    const monthTitle = currentMonth.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });

    const calendarDays = getCalendarDays(currentMonth);

    function goToPreviousMonth() {
        onChangeMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
        );
    }

    function goToNextMonth() {
        onChangeMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
        );
    }

    return (
        <div className="mt-6 rounded-xl border p-4">
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                Prev
                </Button>

                <p className="font-medium">{monthTitle}</p>

                <Button variant="outline" size="sm" onClick={goToNextMonth}>
                Next
                </Button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center">
                {weekDays.map((day) => (
                <div key={day} className="text-sm text-gray-500">
                    {day}
                </div>
                ))}

                {calendarDays.map((date) => (
                <Button
                    key={date.date.toISOString()}
                    onClick={() => {
                        onSelectDate(date.date);
                    }}
                    className={`rounded-lg py-2 text-sm bg-white border transition ${
                        isSameDay(date.date, selectedDate)
                        ? "bg-blue-600 text-white border-blue-600"
                        : date.isCurrentMonth
                        ? "text-gray-900 hover:bg-gray-100"
                        : "text-gray-400 hover:bg-gray-100"
                    }`}
                >
                    {date.day}
                </Button>
                ))}
            </div>
        </div>
    );
}
