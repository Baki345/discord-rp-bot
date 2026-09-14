import { prisma } from "@discord-rp/database";
import { runSecurityDiagnostics } from "@discord-rp/core";

export default async function DiagnosticPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guildConfig = await prisma.guildConfig.findUnique({ where: { guildId } });
  const logRoutes = await prisma.logRoute.findMany({ where: { guildId, category: "GENERAL" } });

  const verificationConfig = guildConfig?.verificationConfig as { enabled?: boolean; verifiedRoleId?: string | null } | undefined;
  const antiNukeConfig = guildConfig?.antiNukeConfig as { enabled?: boolean } | undefined;
  const automodConfig = guildConfig?.automodConfig as { enabled?: boolean } | undefined;

  // Live role-hierarchy check needs a Discord connection — only /securite diagnostic on Discord can verify that part.
  const checks = runSecurityDiagnostics({
    quarantineRoleId: guildConfig?.quarantineRoleId ?? null,
    generalLogRouteChannelId: logRoutes[0]?.channelId ?? null,
    verificationEnabled: verificationConfig?.enabled ?? false,
    verifiedRoleId: verificationConfig?.verifiedRoleId ?? null,
    antiNukeEnabled: antiNukeConfig?.enabled ?? false,
    automodEnabled: automodConfig?.enabled ?? false,
    botRolePosition: null,
    quarantineRolePosition: null,
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Diagnostic de sécurité</h1>
      <p style={{ color: "#a79ec2" }}>
        Vérification de la configuration. La hiérarchie des rôles du bot ne peut être vérifiée que depuis Discord via{" "}
        <code>/securite diagnostic</code>.
      </p>

      <ul style={{ marginTop: 20, listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {checks.map((c, i) => (
          <li key={i} style={{ color: c.ok ? "#4ade80" : "#f87171" }}>
            {c.ok ? "✅" : "⚠️"} <span style={{ color: "#f4f2fa" }}>{c.label}</span>
            {c.detail && <div style={{ color: "#a79ec2", fontSize: "0.85rem", marginLeft: 24 }}>{c.detail}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
