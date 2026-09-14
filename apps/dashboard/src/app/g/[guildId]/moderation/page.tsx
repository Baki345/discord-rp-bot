import { prisma } from "@discord-rp/database";

const ACTION_LABELS: Record<string, string> = {
  WARN: "⚠️ Avertissement",
  TIMEOUT: "⏱️ Timeout",
  UNTIMEOUT: "✅ Fin de timeout",
  KICK: "👢 Expulsion",
  BAN: "🔨 Bannissement",
  UNBAN: "✅ Fin de bannissement",
  QUARANTINE: "🔒 Quarantaine",
  UNQUARANTINE: "✅ Fin de quarantaine",
  LOCK: "🔐 Verrouillage",
  UNLOCK: "✅ Déverrouillage",
};

export default async function ModerationPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const cases = await prisma.moderationCase.findMany({
    where: { guildId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Modération</h1>
      <p style={{ color: "#a79ec2" }}>Les 100 derniers cas — avertissements, timeouts, expulsions, bans. Actions via /mod sur Discord.</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Date</th>
            <th style={{ padding: "8px 4px" }}>Action</th>
            <th style={{ padding: "8px 4px" }}>Cible</th>
            <th style={{ padding: "8px 4px" }}>Modérateur</th>
            <th style={{ padding: "8px 4px" }}>Raison</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px", color: "#a79ec2", whiteSpace: "nowrap" }}>{c.createdAt.toLocaleString("fr-FR")}</td>
              <td style={{ padding: "8px 4px" }}>
                {ACTION_LABELS[c.action] ?? c.action}
                {c.points > 0 && <span style={{ color: "#a79ec2" }}> ({c.points} pt)</span>}
                {c.durationMinutes != null && <span style={{ color: "#a79ec2" }}> — {c.durationMinutes} min</span>}
              </td>
              <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{c.targetDiscordId}</td>
              <td style={{ padding: "8px 4px", fontFamily: "monospace", color: "#a79ec2" }}>{c.moderatorId}</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{c.reason ?? "—"}</td>
            </tr>
          ))}
          {cases.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucun cas de modération pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
