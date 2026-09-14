import { prisma } from "@discord-rp/database";

const TIER_LABELS: Record<string, string> = {
  EXTRA_OWNER: "👑 Extra owner",
  TRUSTED_ADMIN: "🛡️ Trusted admin",
};

export default async function StaffPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [guild, staff, rescueKey] = await Promise.all([
    prisma.guild.findUnique({ where: { id: guildId }, select: { ownerDiscordId: true } }),
    prisma.securityStaff.findMany({ where: { guildId }, orderBy: { addedAt: "asc" } }),
    prisma.rescueKey.findUnique({ where: { guildId } }),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Hiérarchie de sécurité</h1>
      <p style={{ color: "#a79ec2" }}>
        Gérée depuis Discord via <code>/securite staff</code>. Le propriétaire du serveur et les extra owners sont
        immunisés contre toute action de modération venant d&apos;un trusted admin.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Rôle</th>
            <th style={{ padding: "8px 4px" }}>Membre</th>
            <th style={{ padding: "8px 4px" }}>Depuis</th>
          </tr>
        </thead>
        <tbody>
          {guild?.ownerDiscordId && (
            <tr style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>👑 Propriétaire</td>
              <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{guild.ownerDiscordId}</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>—</td>
            </tr>
          )}
          {staff.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>{TIER_LABELS[s.tier] ?? s.tier}</td>
              <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{s.discordUserId}</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{s.addedAt.toLocaleDateString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Clé de secours</h2>
      {rescueKey ? (
        <p style={{ color: "#a79ec2" }}>
          Générée le {rescueKey.createdAt.toLocaleString("fr-FR")}
          {rescueKey.redeemedAt
            ? ` — déjà utilisée le ${rescueKey.redeemedAt.toLocaleString("fr-FR")}.`
            : " — active, pas encore utilisée."}
        </p>
      ) : (
        <p style={{ color: "#a79ec2" }}>Aucune clé de secours générée pour l&apos;instant.</p>
      )}
      <p style={{ color: "#a79ec2" }}>
        Génère-en une (ou une nouvelle) avec <code>/securite cle-secours generer</code> — réservé au propriétaire du
        serveur. Elle s&apos;utilise avec <code>/rescue</code>.
      </p>
    </div>
  );
}
