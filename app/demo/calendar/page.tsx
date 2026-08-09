import { redirect } from "next/navigation";

export default function DemoCalendarPage() {
  redirect("/calendar?demo=1");
}
