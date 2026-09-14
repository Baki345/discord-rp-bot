"use client";

import { usePathname } from "next/navigation";
import { findPageLabel } from "./nav-sections";

export function Topbar({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const title = findPageLabel(pathname, guildId);

  return (
    <header className="topbar">
      <h2 className="topbar-title">{title}</h2>
    </header>
  );
}
