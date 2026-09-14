import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { loadEnv, getSuperAdminDiscordIds } from "@discord-rp/config";
import { auth } from "@/auth/auth.config";

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
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      <nav
        style={{
          width: 220,
          borderRight: "1px solid #2a2340",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <a href="/" style={{ color: "#a79ec2", fontSize: "0.85rem", marginBottom: 16 }}>
          ← Tes serveurs
        </a>
        <a href="/admin" style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Panneau global
        </a>
      </nav>
      <div style={{ flex: 1, padding: "32px 40px" }}>{children}</div>
    </div>
  );
}
