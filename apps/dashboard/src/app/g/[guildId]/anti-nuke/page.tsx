import { prisma } from "@discord-rp/database";
import { AntiNukeConfig } from "@discord-rp/core";

export default async function AntiNukePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [guildConfig, incidents] = await Promise.all([
    prisma.guildConfig.findUnique({ where: { guildId } }),
    prisma.securityIncident.findMany({ where: { guildId, kind: "anti_nuke" }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const parsed = AntiNukeConfig.safeParse(guildConfig?.antiNukeConfig ?? {});
  const config = parsed.success ? parsed.data : AntiNukeConfig.parse({});

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Anti-nuke</h1>
      <p style={{ color: "#a79ec2" }}>
        Configuré depuis Discord via <code>/securite anti-nuke</code>. Surveille en temps réel les actions
        destructrices via le journal d&apos;audit Discord.
      </p>

      <div style={cardStyle}>
        <div>État : <strong>{config.enabled ? "activé" : "désactivé"}</strong></div>
        <div>Mode strict : <strong>{config.strictMode ? "oui" : "non"}</strong></div>
        <div>Seuil par minute : <strong>{config.perMinuteThreshold}</strong></div>
        <div>Seuil par heure : <strong>{config.perHourThreshold}</strong></div>
        <div>Quarantaine automatique : <strong>{config.autoQuarantineOnBreach ? "oui" : "non"}</strong></div>
        <div>Utilisateurs en liste blanche : <strong>{config.whitelistedDiscordIds.length}</strong></div>
        <div>Catégories en liste blanche : <strong>{config.whitelistedCategoryIds.length}</strong></div>
      </div>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Dossiers d&apos;incident</h2>
      {incidents.length === 0 ? (
        <p style={{ color: "#a79ec2" }}>Aucun incident pour l&apos;instant.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
              <th style={{ padding: "8px 4px" }}>Date</th>
              <th style={{ padding: "8px 4px" }}>Auteur</th>
              <th style={{ padding: "8px 4px" }}>Type</th>
              <th style={{ padding: "8px 4px" }}>Quarantaine auto</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => {
              const details = incident.details as { subKind?: string };
              return (
                <tr key={incident.id} style={{ borderBottom: "1px solid #1a1530" }}>
                  <td style={{ padding: "8px 4px", color: "#a79ec2", whiteSpace: "nowrap" }}>{incident.createdAt.toLocaleString("fr-FR")}</td>
                  <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{incident.actorId}</td>
                  <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{details.subKind ?? "—"}</td>
                  <td style={{ padding: "8px 4px" }}>{incident.autoQuarantined ? "✅" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const cardStyle = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 12,
  padding: "16px 20px",
  marginTop: 20,
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
  color: "#a79ec2",
  maxWidth: 420,
};
