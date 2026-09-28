"use client";

import { useMemo } from "react";
import { CalendarWorkspace } from "@/components/calendar/CalendarWorkspace";
import { useDemoWorkspace } from "@/components/demo/DemoWorkspaceProvider";

export default function CalendarPage() {
  const demo = useDemoWorkspace();
  const items = useMemo(
    () =>
      demo?.calendarItems.map((item) => ({
        ...item,
        classId:
          demo.classes.find((course) => course.classCode === item.className)
            ?.id ?? null,
      })),
    [demo],
  );
  return (
    <CalendarWorkspace
      initialDate={demo?.date}
      initialItems={items}
      initialClasses={demo?.classes}
      readOnly={demo !== null}
    />
  );
}
