import { prisma } from "@discord-rp/database";

const ACTOR_LABELS: Record<string, string> = {
  DISCORD_USER: "Discord",
  DASHBOARD_USER: "Dashboard",
  SYSTEM: "Système",
};

export default async function LogsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const entries = await prisma.auditLog.findMany({
    where: { guildId },
    include: { actorCharacter: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Journal d&apos;audit</h1>
      <p style={{ color: "#a79ec2" }}>Les 100 dernières actions administratives et RP de ce serveur.</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Date</th>
            <th style={{ padding: "8px 4px" }}>Action</th>
            <th style={{ padding: "8px 4px" }}>Acteur</th>
            <th style={{ padding: "8px 4px" }}>Cible</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px", color: "#a79ec2", whiteSpace: "nowrap" }}>
                {entry.createdAt.toLocaleString("fr-FR")}
              </td>
              <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{entry.action}</td>
              <td style={{ padding: "8px 4px" }}>
                {ACTOR_LABELS[entry.actorType] ?? entry.actorType}
                {entry.actorCharacter && ` — ${entry.actorCharacter.firstName} ${entry.actorCharacter.lastName}`}
                {!entry.actorCharacter && entry.actorDiscordId && (
                  <span style={{ color: "#a79ec2", fontFamily: "monospace" }}> ({entry.actorDiscordId})</span>
                )}
              </td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>
                {entry.targetType ? `${entry.targetType}${entry.targetId ? ` #${entry.targetId.slice(0, 8)}` : ""}` : "—"}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucune entrée pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
