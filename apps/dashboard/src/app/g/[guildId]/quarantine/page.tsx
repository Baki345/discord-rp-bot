import { prisma } from "@discord-rp/database";

export default async function QuarantinePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [config, active, history] = await Promise.all([
    prisma.guildConfig.findUnique({ where: { guildId } }),
    prisma.quarantineRecord.findMany({ where: { guildId, releasedAt: null }, orderBy: { quarantinedAt: "desc" } }),
    prisma.quarantineRecord.findMany({ where: { guildId, releasedAt: { not: null } }, orderBy: { releasedAt: "desc" }, take: 20 }),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Quarantaine</h1>
      <p style={{ color: "#a79ec2" }}>
        Rôle de quarantaine : {config?.quarantineRoleId ? <code>#{config.quarantineRoleId}</code> : "non configuré"}.
        Géré depuis Discord via <code>/securite quarantaine</code>.
      </p>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Actuellement en quarantaine ({active.length})</h2>
      {active.length === 0 ? (
        <p style={{ color: "#a79ec2" }}>Personne pour l&apos;instant.</p>
      ) : (
        <ul>
          {active.map((q) => (
            <li key={q.id} style={{ color: "#a79ec2", fontSize: "0.9rem" }}>
              <span style={{ fontFamily: "monospace", color: "#f4f2fa" }}>{q.discordUserId}</span> — depuis{" "}
              {q.quarantinedAt.toLocaleString("fr-FR")}
              {q.reason ? ` (${q.reason})` : ""}
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Historique</h2>
      {history.length === 0 ? (
        <p style={{ color: "#a79ec2" }}>Aucune quarantaine terminée pour l&apos;instant.</p>
      ) : (
        <ul>
          {history.map((q) => (
            <li key={q.id} style={{ color: "#a79ec2", fontSize: "0.9rem" }}>
              <span style={{ fontFamily: "monospace", color: "#f4f2fa" }}>{q.discordUserId}</span> — du{" "}
              {q.quarantinedAt.toLocaleString("fr-FR")} au {q.releasedAt?.toLocaleString("fr-FR")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
