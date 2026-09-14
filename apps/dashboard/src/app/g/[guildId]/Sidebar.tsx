"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_SECTIONS, OVERVIEW_ITEM } from "./nav-sections";

export function Sidebar({ guildId, guildName }: { guildId: string; guildName: string }) {
  const pathname = usePathname();
  const base = `/g/${guildId}`;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleSection(label: string) {
    setCollapsed((c) => ({ ...c, [label]: !c[label] }));
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <div className="mobile-topbar">
        <button type="button" className="hamburger" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
          ☰
        </button>
        <span className="sidebar-brand-title">{guildName}</span>
      </div>

      <div className={`sidebar-overlay ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)} />

      <nav className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">RP</span>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-title">{guildName}</div>
            <Link href="/" className="sidebar-brand-back">
              ← Tes serveurs
            </Link>
          </div>
        </div>

        <div className="sidebar-scroll">
          <Link href={base} className={`sidebar-link sidebar-link-top ${pathname === base ? "active" : ""}`}>
            {OVERVIEW_ITEM.label}
          </Link>

          {NAV_SECTIONS.map((section) => {
            const isCollapsed = collapsed[section.label] ?? false;
            return (
              <div className="sidebar-section" key={section.label}>
                <button type="button" className="sidebar-section-label" onClick={() => toggleSection(section.label)}>
                  <span>{section.label}</span>
                  <span className={`sidebar-chevron ${isCollapsed ? "collapsed" : ""}`}>›</span>
                </button>
                {!isCollapsed && (
                  <div className="sidebar-section-items">
                    {section.items.map((item) => {
                      const href = `${base}${item.href}`;
                      return (
                        <Link key={item.href} href={href} className={`sidebar-link ${isActive(href) ? "active" : ""}`}>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}
