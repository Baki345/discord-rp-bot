import type { CSSProperties } from "react";
import { listGuildsOverview, getGlobalStats } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { setGuildBlacklistedAction } from "./actions";

export default async function AdminPage() {
  const session = await auth();
  const [stats, guilds] = await Promise.all([
    getGlobalStats(session!.user.discordId),
    listGuildsOverview(session!.user.discordId),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Panneau global</h1>
      <p style={{ color: "#a79ec2" }}>Vue d&apos;ensemble tous serveurs confondus — réservée à l&apos;opérateur du bot.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 20 }}>
        <StatCard label="Serveurs" value={stats.totalGuilds} />
        <StatCard label="Serveurs suspendus" value={stats.blacklistedGuilds} />
        <StatCard label="Utilisateurs" value={stats.totalUsers} />
        <StatCard label="Personnages" value={stats.totalCharacters} />
        <StatCard label="Sanctions (24h)" value={stats.moderationCases24h} />
        <StatCard label="Quarantaines actives" value={stats.activeQuarantines} />
      </div>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Serveurs</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#a79ec2", fontSize: "0.8rem" }}>
            <th style={thStyle}>Serveur</th>
            <th style={thStyle}>Plan</th>
            <th style={thStyle}>Personnages</th>
            <th style={thStyle}>Sanctions (24h)</th>
            <th style={thStyle}>Statut</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {guilds.map((guild) => (
            <tr key={guild.id} style={{ borderTop: "1px solid #2a2340" }}>
              <td style={tdStyle}>
                <strong>{guild.name}</strong>
                <div style={{ color: "#a79ec2", fontSize: "0.75rem" }}>{guild.id}</div>
              </td>
              <td style={tdStyle}>{guild.planName}</td>
              <td style={tdStyle}>{guild.characterCount}</td>
              <td style={tdStyle}>{guild.moderationCases24h}</td>
              <td style={tdStyle}>
                {guild.isBlacklisted ? <span style={{ color: "#f87171" }}>Suspendu</span> : <span style={{ color: "#4ade80" }}>Actif</span>}
              </td>
              <td style={tdStyle}>
                <form action={setGuildBlacklistedAction.bind(null, guild.id, !guild.isBlacklisted)}>
                  <button type="submit" style={guild.isBlacklisted ? unsuspendButtonStyle : suspendButtonStyle}>
                    {guild.isBlacklisted ? "Réactiver" : "Suspendre"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#171225", border: "1px solid #2a2340", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ color: "#a79ec2", fontSize: "0.75rem" }}>{label}</div>
      <div style={{ color: "#f4f2fa", fontSize: "1.6rem", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const thStyle: CSSProperties = { padding: "6px 10px" };
const tdStyle: CSSProperties = { padding: "10px 10px", color: "#f4f2fa", fontSize: "0.9rem" };
const suspendButtonStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid #f87171",
  color: "#f87171",
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: "0.8rem",
};
const unsuspendButtonStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid #4ade80",
  color: "#4ade80",
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: "0.8rem",
};
