"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function HydrationMarker() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.hydratedPath = pathname;

    return () => {
      if (root.dataset.hydratedPath === pathname) {
        delete root.dataset.hydratedPath;
      }
    };
  }, [pathname]);

  return null;
}
