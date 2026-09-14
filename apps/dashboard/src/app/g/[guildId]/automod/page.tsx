import { prisma } from "@discord-rp/database";
import { AutomodConfig } from "@discord-rp/core";

export default async function AutomodPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guildConfig = await prisma.guildConfig.findUnique({ where: { guildId } });
  const parsed = AutomodConfig.safeParse(guildConfig?.automodConfig ?? {});
  const config = parsed.success ? parsed.data : AutomodConfig.parse({});

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Auto-modération</h1>
      <p style={{ color: "#a79ec2" }}>
        Configurée depuis Discord via <code>/securite automod</code>. Les poids exacts des facteurs de chaleur sont
        internes (non exposés), seuls les seuils le sont.
      </p>

      <div style={cardStyle}>
        <div>État : <strong>{config.enabled ? "activée" : "désactivée"}</strong></div>
        <div>Chaleur max : <strong>{config.maxHeat}</strong></div>
        <div>Décroissance : <strong>{config.decayPerSecond}/s</strong></div>
        <div>Strikes avant cap : <strong>{config.strikesBeforeCap}</strong></div>
        <div>Timeout normal : <strong>{config.normalTimeoutMinutes} min</strong></div>
        <div>Timeout cap : <strong>{config.capTimeoutMinutes} min</strong></div>
        <div>Multiplicateur récidive : <strong>×{config.recidivismMultiplier}</strong></div>
        <div>Reset après timeout : <strong>{config.resetHeatOnTimeout ? "oui" : "non"}</strong></div>
        <div>Mode panique : <strong>{config.panicOffendersThreshold} contrevenants / {config.panicWindowSeconds}s</strong></div>
        <div>Anti-flood mentions : <strong>{config.mentionFloodMaxPerWindow} / {config.mentionFloodWindowSeconds}s</strong></div>
      </div>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Liste noire de mots ({config.wordBlacklist.length})</h2>
      <p style={{ color: "#a79ec2" }}>{config.wordBlacklist.length > 0 ? config.wordBlacklist.join(", ") : "Aucun."}</p>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Liste noire de domaines ({config.domainBlacklist.length})</h2>
      <p style={{ color: "#a79ec2" }}>{config.domainBlacklist.length > 0 ? config.domainBlacklist.join(", ") : "Aucun."}</p>
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
