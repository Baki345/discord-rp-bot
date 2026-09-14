import { prisma } from "@discord-rp/database";

export default async function MarketPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const listed = await prisma.company.findMany({
    where: { guildId, isPubliclyListed: true },
    select: { id: true, name: true, sharePriceCents: true, totalShares: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Bourse</h1>
      <p style={{ color: "#a79ec2" }}>
        Nécessite la fonctionnalité &quot;stockMarket&quot; activée sur le plan du serveur. Une entreprise se cote via{" "}
        <code>/entreprise coter</code> (son propriétaire), puis se négocie avec <code>/bourse</code>.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Entreprise</th>
            <th style={{ padding: "8px 4px" }}>Cours</th>
            <th style={{ padding: "8px 4px" }}>Actions émises</th>
          </tr>
        </thead>
        <tbody>
          {listed.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>{c.name}</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{((c.sharePriceCents ?? 0) / 100).toFixed(2)} $</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{c.totalShares}</td>
            </tr>
          ))}
          {listed.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucune entreprise cotée pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
