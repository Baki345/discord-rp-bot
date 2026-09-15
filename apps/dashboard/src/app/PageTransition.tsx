"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Re-keys its child tree on every route change so the mount animation
 * (`.page-transition` in globals.css) replays — the cheapest way to get a
 * per-section transition in the App Router without a client-state library.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
