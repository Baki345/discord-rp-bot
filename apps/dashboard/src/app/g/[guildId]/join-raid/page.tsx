import { prisma } from "@discord-rp/database";
import { JoinRaidConfig } from "@discord-rp/core";

export default async function JoinRaidPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [guildConfig, incidents] = await Promise.all([
    prisma.guildConfig.findUnique({ where: { guildId } }),
    prisma.securityIncident.findMany({ where: { guildId, kind: "join_raid" }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  const parsed = JoinRaidConfig.safeParse(guildConfig?.joinRaidConfig ?? {});
  const config = parsed.success ? parsed.data : JoinRaidConfig.parse({});

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Raid d&apos;arrivées</h1>
      <p style={{ color: "#a79ec2" }}>
        Configuré depuis Discord via <code>/config raid-arrivees</code>. Actuellement{" "}
        <strong>{config.enabled ? "activé" : "désactivé"}</strong> — seuil : {config.minJoins} arrivées /{" "}
        {config.windowSeconds}s, cible : {config.target === "ALL" ? "tous les comptes" : "comptes suspects seulement"}, action :{" "}
        {config.action}. Verrouillage automatique du serveur au déclenchement :{" "}
        <strong>{config.autoLockdownOnTrigger ? "activé" : "désactivé"}</strong>.
      </p>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Incidents détectés</h2>
      {incidents.length === 0 ? (
        <p style={{ color: "#a79ec2" }}>Aucun raid détecté pour l&apos;instant.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
              <th style={{ padding: "8px 4px" }}>Date</th>
              <th style={{ padding: "8px 4px" }}>Comptes attrapés</th>
              <th style={{ padding: "8px 4px" }}>Raison</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => {
              const details = incident.details as { matchedMemberIds?: string[]; reason?: string };
              return (
                <tr key={incident.id} style={{ borderBottom: "1px solid #1a1530" }}>
                  <td style={{ padding: "8px 4px", color: "#a79ec2", whiteSpace: "nowrap" }}>{incident.createdAt.toLocaleString("fr-FR")}</td>
                  <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{details.matchedMemberIds?.length ?? 0}</td>
                  <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{details.reason ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
