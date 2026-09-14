import { notFound } from "next/navigation";
import { prisma } from "@discord-rp/database";

export default async function GuildOverviewPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await prisma.guild.findUnique({ where: { id: guildId }, include: { plan: true } });
  if (!guild) notFound();
  const characterCount = await prisma.character.count({ where: { guildId, deletedAt: null } });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>{guild.name}</h1>
      <p style={{ color: "#a79ec2" }}>
        Plan {guild.plan.name} — {characterCount}/{guild.plan.maxCharactersPerGuild} personnage(s)
      </p>
    </div>
  );
}
