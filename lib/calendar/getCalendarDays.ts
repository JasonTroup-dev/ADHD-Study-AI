export type CalendarDay = {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
};

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getCalendarDays(currentMonth: Date): CalendarDay[] {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();

  const calendarDays: CalendarDay[] = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPreviousMonth - i,
      date: new Date(year, month - 1, daysInPreviousMonth - i),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  // Add only enough next-month days to finish the final week. This keeps the
  // entire current month visible without reserving an unnecessary sixth row.
  while (calendarDays.length % 7 !== 0) {
    const nextMonthDay =
      calendarDays.length - firstDayOfMonth - daysInMonth + 1;

    calendarDays.push({
      day: nextMonthDay,
      date: new Date(year, month + 1, nextMonthDay),
      isCurrentMonth: false,
    });
  }

  return calendarDays;
}
