import { prisma } from "@discord-rp/database";

export default async function BackupsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const backups = await prisma.securityBackup.findMany({ where: { guildId }, orderBy: { createdAt: "desc" }, take: 30 });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Sauvegardes</h1>
      <p style={{ color: "#a79ec2" }}>
        Gérées depuis Discord via <code>/securite backup</code>. Structure uniquement (salons, rôles, permissions) —
        jamais les messages ni les attributions de rôles des membres.
      </p>

      {backups.length === 0 ? (
        <p style={{ color: "#a79ec2", marginTop: 20 }}>Aucune sauvegarde pour l&apos;instant.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
              <th style={{ padding: "8px 4px" }}>ID</th>
              <th style={{ padding: "8px 4px" }}>Nom</th>
              <th style={{ padding: "8px 4px" }}>Créée le</th>
              <th style={{ padding: "8px 4px" }}>Contenu</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => {
              const snapshot = b.snapshot as { channels?: unknown[]; roles?: unknown[] };
              return (
                <tr key={b.id} style={{ borderBottom: "1px solid #1a1530" }}>
                  <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{b.id.slice(0, 12)}</td>
                  <td style={{ padding: "8px 4px" }}>{b.label ?? "—"}</td>
                  <td style={{ padding: "8px 4px", color: "#a79ec2", whiteSpace: "nowrap" }}>{b.createdAt.toLocaleString("fr-FR")}</td>
                  <td style={{ padding: "8px 4px", color: "#a79ec2" }}>
                    {snapshot.channels?.length ?? 0} salons, {snapshot.roles?.length ?? 0} rôles
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
