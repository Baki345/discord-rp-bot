import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@discord-rp/database";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

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

  // Only a Discord guild admin, or a member holding at least one delegated
  // RPRole permission, may open this guild's dashboard.
  if (!actor.isDiscordGuildAdmin && actor.rpPermissions.length === 0) {
    redirect("/");
  }

  const guild = await prisma.guild.findUnique({ where: { id: guildId }, select: { name: true } });

  return (
    <div className="app-shell">
      <Sidebar guildId={guildId} guildName={guild?.name ?? "Serveur"} />
      <div className="app-content">
        <Topbar guildId={guildId} />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
