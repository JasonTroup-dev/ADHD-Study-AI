import { CalendarWorkspace } from "../../../components/calendar/CalendarWorkspace";
import {
  calendarFixtureClasses,
  calendarFixtureItems,
} from "../../calendarFixtures";
export default function Preview() {
  return (
    <CalendarWorkspace
      initialDate={new Date(2026, 9, 13)}
      initialItems={calendarFixtureItems}
      initialClasses={calendarFixtureClasses}
      readOnly
    />
  );
}
