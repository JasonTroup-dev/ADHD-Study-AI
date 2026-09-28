import { CalendarWorkspace } from "../../../../components/calendar/CalendarWorkspace";
export default function LiveCalendar() {
  return <CalendarWorkspace initialDate={new Date(2026, 9, 13)} />;
}
