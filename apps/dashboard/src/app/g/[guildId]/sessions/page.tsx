import { prisma } from "@discord-rp/database";

export default async function SessionsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const sessions = await prisma.rPSession.findMany({ where: { guildId }, orderBy: { startedAt: "desc" }, take: 50 });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Sessions RP</h1>
      <p style={{ color: "#a79ec2" }}>
        L&apos;option &quot;Exiger une session RP active&quot; se règle dans Paramètres. Démarrer/arrêter se fait avec{" "}
        <code>/session start</code> et <code>/session stop</code>.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Début</th>
            <th style={{ padding: "8px 4px" }}>Fin</th>
            <th style={{ padding: "8px 4px" }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>{s.startedAt.toLocaleString("fr-FR")}</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{s.endedAt ? s.endedAt.toLocaleString("fr-FR") : "—"}</td>
              <td style={{ padding: "8px 4px" }}>{s.endedAt ? "Terminée" : "🟢 En cours"}</td>
            </tr>
          ))}
          {sessions.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucune session pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
