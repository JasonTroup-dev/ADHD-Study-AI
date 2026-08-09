import { redirect } from "next/navigation";

export default function DemoClassesPage() {
  redirect("/classes?demo=1");
}
