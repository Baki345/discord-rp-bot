import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { loadEnv, getSuperAdminDiscordIds } from "@discord-rp/config";
import { auth } from "@/auth/auth.config";
import { PageTransition } from "@/app/PageTransition";

/**
 * Distinct from apps/dashboard/src/app/g/[guildId]/layout.tsx's guard: that
 * one checks per-guild Discord-admin/RPRole access, this checks the flat
 * SUPER_ADMIN_DISCORD_IDS allowlist — the bot operator, not any one
 * server's owner. Redirects to the guild selector rather than /login so a
 * logged-in non-operator doesn't see a dead end.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const superAdminIds = getSuperAdminDiscordIds(loadEnv());
  if (!superAdminIds.includes(session.user.discordId)) redirect("/");

  return (
    <div className="app-shell">
      <nav className="sidebar" style={{ position: "sticky" }}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="ULTRA RPBOT" className="sidebar-brand-mark" />
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-title">Opérateur</div>
            <a href="/" className="sidebar-brand-back">
              ← Tes serveurs
            </a>
          </div>
        </div>
        <div className="sidebar-scroll">
          <a href="/admin" className="sidebar-link sidebar-link-top active">
            Panneau global
          </a>
        </div>
      </nav>
      <div className="app-content">
        <main className="app-main">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
