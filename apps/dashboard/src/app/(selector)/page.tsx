import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@discord-rp/database";
import { loadEnv, getSuperAdminDiscordIds } from "@discord-rp/config";
import { auth } from "@/auth/auth.config";
import { fetchUserGuilds, hasGuildAdminPermission } from "@/auth/discord-api";

async function getEligibleGuilds(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "discord" },
    select: { access_token: true },
  });
  if (!account?.access_token) return { guilds: [], discordUnavailable: true as const };

  let discordGuilds;
  try {
    discordGuilds = await fetchUserGuilds(account.access_token);
  } catch {
    return { guilds: [], discordUnavailable: true as const };
  }

  const adminGuildIds = discordGuilds.filter((g) => hasGuildAdminPermission(g.permissions)).map((g) => g.id);
  if (adminGuildIds.length === 0) return { guilds: [], discordUnavailable: false as const };

  // Only guilds BOTH administrable by this user AND already running the bot
  // (a row exists here the moment the bot joins — see ensureGuild()).
  const installedGuilds = await prisma.guild.findMany({
    where: { id: { in: adminGuildIds } },
    include: { plan: true },
  });
  return { guilds: installedGuilds, discordUnavailable: false as const };
}

export default async function GuildSelectorPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { guilds, discordUnavailable } = await getEligibleGuilds(session.user.id);
  const isSuperAdmin = getSuperAdminDiscordIds(loadEnv()).includes(session.user.discordId);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: "1.4rem" }}>Tes serveurs</h1>
      {isSuperAdmin && (
        <Link href="/admin" style={{ color: "#a79ec2", fontSize: "0.85rem", display: "inline-block", marginBottom: 16 }}>
          → Panneau global (opérateur)
        </Link>
      )}
      {discordUnavailable && (
        <p style={{ color: "#f87171" }}>Impossible de récupérer tes serveurs Discord pour le moment — réessaie plus tard.</p>
      )}
      {!discordUnavailable && guilds.length === 0 && (
        <p style={{ color: "#a79ec2" }}>
          Aucun serveur trouvé où tu es administrateur ET où le bot est installé. Invite le bot sur un de tes serveurs
          pour commencer.
        </p>
      )}
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {guilds.map((guild) => (
          <li key={guild.id}>
            <Link
              href={`/g/${guild.id}`}
              style={{
                display: "block",
                padding: "16px 20px",
                borderRadius: 12,
                border: "1px solid #2a2340",
                background: "#171225",
                color: "#f4f2fa",
                textDecoration: "none",
              }}
            >
              <strong>{guild.name}</strong>
              <div style={{ color: "#a79ec2", fontSize: "0.85rem" }}>Plan {guild.plan.name}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
