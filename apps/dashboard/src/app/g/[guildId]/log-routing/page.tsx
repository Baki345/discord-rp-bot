import { prisma } from "@discord-rp/database";

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "Généraux",
  MODERATION: "Modération",
  APPEALS: "Appels",
  AUTOMOD: "Auto-modération",
  ANTI_NUKE: "Anti-nuke",
  VERIFICATION: "Vérification",
  JOIN_GATE: "Porte d'entrée",
  JOIN_RAID: "Raid d'arrivées",
  PANIC: "Mode panique",
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

export default async function LogRoutingPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const routes = await prisma.logRoute.findMany({ where: { guildId } });
  const routeByCategory = new Map<string, string>(routes.map((r) => [r.category, r.channelId]));

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Routage des logs</h1>
      <p style={{ color: "#a79ec2" }}>
        Configuré depuis Discord via <code>/config salon-securite</code>. Une catégorie sans salon dédié tombe dans
        le salon &quot;Généraux&quot;.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Catégorie</th>
            <th style={{ padding: "8px 4px" }}>Salon</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORY_ORDER.map((category) => {
            const channelId = routeByCategory.get(category);
            return (
              <tr key={category} style={{ borderBottom: "1px solid #1a1530" }}>
                <td style={{ padding: "8px 4px" }}>{CATEGORY_LABELS[category]}</td>
                <td style={{ padding: "8px 4px", fontFamily: "monospace", color: channelId ? "#f4f2fa" : "#a79ec2" }}>
                  {channelId ? `#${channelId}` : category === "GENERAL" ? "— (aucun log ne sera livré)" : "— (utilise Généraux)"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
