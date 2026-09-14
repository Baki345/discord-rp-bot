import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export default async function GuildLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { guildId } = await params;
  const actor = await resolveActorContext(session, guildId);

  // No RPRole delegation exists yet (M9) — until then, only a Discord guild
  // admin can open this guild's dashboard at all.
  if (!actor.isDiscordGuildAdmin && actor.rpPermissions.length === 0) {
    redirect("/");
  }

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
        <a href={`/g/${guildId}`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Vue d&apos;ensemble
        </a>
        <a href={`/g/${guildId}/characters`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Personnages
        </a>
        <a href={`/g/${guildId}/economy`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Économie
        </a>
      </nav>
      <div style={{ flex: 1, padding: "32px 40px" }}>{children}</div>
    </div>
  );
}
