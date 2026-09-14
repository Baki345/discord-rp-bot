import { prisma } from "@discord-rp/database";
import { JoinGateConfig, JOIN_GATE_FILTERS, type JoinGateFilterName } from "@discord-rp/core";

const FILTER_LABELS: Record<JoinGateFilterName, string> = {
  noAvatar: "Pas de photo de profil",
  minAccountAge: "Âge minimum du compte",
  unauthorizedBotAdd: "Ajout de bot non autorisé",
  unverifiedBot: "Bots non vérifiés par Discord",
  inviteInUsername: "Invitation Discord dans le pseudo",
  suspiciousAccount: "Compte jugé suspect",
  nicknameBlacklist: "Pseudo sur liste noire",
};

const ACTION_LABELS: Record<string, string> = { LOG: "Journal seulement", TIMEOUT: "Timeout", KICK: "Expulsion", BAN: "Bannissement" };

export default async function JoinGatePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  const parsed = JoinGateConfig.safeParse(config?.joinGateConfig ?? {});
  const gate = parsed.success ? parsed.data : {};

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Porte d&apos;entrée</h1>
      <p style={{ color: "#a79ec2" }}>
        Filtres appliqués à l&apos;arrivée d&apos;un membre — configurés depuis Discord via{" "}
        <code>/config porte-entree</code>.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Filtre</th>
            <th style={{ padding: "8px 4px" }}>État</th>
            <th style={{ padding: "8px 4px" }}>Action</th>
            <th style={{ padding: "8px 4px" }}>Détails</th>
          </tr>
        </thead>
        <tbody>
          {JOIN_GATE_FILTERS.map((filter) => {
            const setting = gate[filter];
            return (
              <tr key={filter} style={{ borderBottom: "1px solid #1a1530" }}>
                <td style={{ padding: "8px 4px" }}>{FILTER_LABELS[filter]}</td>
                <td style={{ padding: "8px 4px", color: setting?.enabled ? "#4ade80" : "#a79ec2" }}>
                  {setting?.enabled ? "Actif" : "Inactif"}
                </td>
                <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{setting ? (ACTION_LABELS[setting.action] ?? setting.action) : "—"}</td>
                <td style={{ padding: "8px 4px", color: "#a79ec2", fontSize: "0.85rem" }}>
                  {setting && "minutes" in setting && `${setting.minutes} min`}
                  {setting && "patterns" in setting && setting.patterns.join(", ")}
                  {setting && "authorizedAdderIds" in setting && `${setting.authorizedAdderIds.length} ID(s) autorisé(s)`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
