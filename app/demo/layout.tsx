import type { ReactNode } from "react";

import AppLayout from "@/app/(app)/layout";
import { DemoWorkspaceProvider } from "@/components/demo/DemoWorkspaceProvider";

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <DemoWorkspaceProvider>
      <AppLayout>{children}</AppLayout>
    </DemoWorkspaceProvider>
  );
}
