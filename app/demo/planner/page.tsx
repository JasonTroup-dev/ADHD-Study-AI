import { redirect } from "next/navigation";

export default function DemoPlannerPage() {
  redirect("/planner?demo=1");
}
