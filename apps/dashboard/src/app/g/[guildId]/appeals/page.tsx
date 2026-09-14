import { prisma } from "@discord-rp/database";

const STATUS_LABELS: Record<string, string> = { PENDING: "⏳ En attente", ACCEPTED: "✅ Accepté", REJECTED: "❌ Rejeté" };

export default async function AppealsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const appeals = await prisma.appeal.findMany({
    where: { guildId },
    include: { case: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Appels</h1>
      <p style={{ color: "#a79ec2" }}>
        Un membre fait appel via <code>/appel</code>, le staff traite via <code>/mod appel-liste</code> et{" "}
        <code>/mod appel-traiter</code>.
      </p>

      {appeals.length === 0 ? (
        <p style={{ color: "#a79ec2", marginTop: 20 }}>Aucun appel pour l&apos;instant.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
              <th style={{ padding: "8px 4px" }}>Date</th>
              <th style={{ padding: "8px 4px" }}>Membre</th>
              <th style={{ padding: "8px 4px" }}>Cas</th>
              <th style={{ padding: "8px 4px" }}>Statut</th>
              <th style={{ padding: "8px 4px" }}>Message</th>
            </tr>
          </thead>
          <tbody>
            {appeals.map((a) => (
              <tr key={a.id} style={{ borderBottom: "1px solid #1a1530" }}>
                <td style={{ padding: "8px 4px", color: "#a79ec2", whiteSpace: "nowrap" }}>{a.createdAt.toLocaleString("fr-FR")}</td>
                <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{a.discordUserId}</td>
                <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{a.case.action}</td>
                <td style={{ padding: "8px 4px" }}>{STATUS_LABELS[a.status] ?? a.status}</td>
                <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{a.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
