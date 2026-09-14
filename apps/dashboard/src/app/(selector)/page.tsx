import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@discord-rp/database";
import { loadEnv, getSuperAdminDiscordIds } from "@discord-rp/config";
import { auth } from "@/auth/auth.config";
import { fetchUserGuilds, hasGuildAdminPermission } from "@/auth/discord-api";
import { getBotInviteUrl } from "@/invite/bot-invite-url";

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
  const inviteUrl = getBotInviteUrl();

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "56px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/logo.png"
            alt="ULTRA RPBOT"
            width={40}
            height={40}
            style={{ borderRadius: 10, boxShadow: "0 0 4px var(--neon-glow-strong), 0 0 24px var(--neon-glow-soft)", flexShrink: 0 }}
          />
          <h1 style={{ fontSize: "1.5rem" }}>Tes serveurs</h1>
        </div>
        {inviteUrl && (
          <a href={inviteUrl} className="neon-button" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
            + Inviter ULTRA RPBOT
          </a>
        )}
      </div>
      {isSuperAdmin && (
        <Link href="/admin" style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "inline-block", marginBottom: 24 }}>
          → Panneau global (opérateur)
        </Link>
      )}
      {discordUnavailable && (
        <p style={{ color: "var(--danger)" }}>Impossible de récupérer tes serveurs Discord pour le moment — réessaie plus tard.</p>
      )}
      {!discordUnavailable && guilds.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>
          Aucun serveur trouvé où tu es administrateur ET où le bot est installé.{" "}
          {inviteUrl ? (
            <>
              Clique sur <strong>« Inviter ULTRA RPBOT »</strong> ci-dessus pour l&apos;ajouter à un de tes serveurs.
            </>
          ) : (
            "Invite le bot sur un de tes serveurs pour commencer."
          )}
        </p>
      )}
      <ul style={{ listStyle: "none", padding: 0, marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        {guilds.map((guild) => (
          <li key={guild.id}>
            <Link
              href={`/g/${guild.id}`}
              className="surface-card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 22px",
                color: "var(--text)",
                textDecoration: "none",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <span>
                <strong style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{guild.name}</strong>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 2 }}>Plan {guild.plan.name}</div>
              </span>
              <span style={{ color: "var(--text-faint)", fontSize: "1.1rem" }}>→</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
