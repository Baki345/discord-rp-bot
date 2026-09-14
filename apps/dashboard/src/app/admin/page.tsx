import type { CSSProperties } from "react";
import { listGuildsOverview, getGlobalStats, listRecentAuditActivity } from "@discord-rp/core";
import { prisma } from "@discord-rp/database";
import { auth } from "@/auth/auth.config";
import { setGuildBlacklistedAction, setGuildPlanAction } from "./actions";

type SortKey = "name" | "characters" | "cases";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort } = await searchParams;
  const session = await auth();

  const [stats, guilds, recentActivity, plans] = await Promise.all([
    getGlobalStats(session!.user.discordId),
    listGuildsOverview(session!.user.discordId),
    listRecentAuditActivity(session!.user.discordId),
    prisma.premiumPlan.findMany({ orderBy: { priceCents: "asc" } }),
  ]);

  const query = (q ?? "").trim().toLowerCase();
  const sortKey: SortKey = sort === "characters" || sort === "cases" ? sort : "name";

  const filtered = guilds.filter((g) => !query || g.name.toLowerCase().includes(query) || g.id.includes(query));
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "characters") return b.characterCount - a.characterCount;
    if (sortKey === "cases") return b.moderationCases24h - a.moderationCases24h;
    return a.name.localeCompare(b.name);
  });

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

      <div style={{ display: "flex", gap: 24, marginTop: 32, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Serveurs ({sorted.length})</h2>
            <form style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Rechercher un serveur..."
                style={searchInputStyle}
              />
              <select name="sort" defaultValue={sortKey} style={sortSelectStyle}>
                <option value="name">Nom</option>
                <option value="characters">Personnages</option>
                <option value="cases">Sanctions (24h)</option>
              </select>
              <button type="submit" style={filterButtonStyle}>
                Filtrer
              </button>
            </form>
          </div>

          <div style={{ overflowX: "auto" }}>
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
                {sorted.map((guild) => (
                  <tr key={guild.id} style={{ borderTop: "1px solid #2a2340" }}>
                    <td style={tdStyle}>
                      <strong>{guild.name}</strong>
                      <div style={{ color: "#a79ec2", fontSize: "0.75rem" }}>{guild.id}</div>
                    </td>
                    <td style={tdStyle}>
                      <form action={setGuildPlanAction.bind(null, guild.id)} style={{ display: "flex", gap: 6 }}>
                        <select name="planId" defaultValue={guild.planId} style={planSelectStyle}>
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </select>
                        <button type="submit" style={smallButtonStyle}>
                          Changer
                        </button>
                      </form>
                    </td>
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
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, color: "#a79ec2", textAlign: "center", padding: "24px 10px" }}>
                      Aucun serveur ne correspond à cette recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ width: 320, flexShrink: 0 }}>
          <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Activité récente</h2>
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {recentActivity.map((row) => (
              <li key={row.id} style={{ background: "#171225", border: "1px solid #2a2340", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ color: "#f4f2fa", fontSize: "0.85rem" }}>{row.action}</div>
                <div style={{ color: "#a79ec2", fontSize: "0.75rem", marginTop: 2 }}>
                  {row.guild.name} · {new Date(row.createdAt).toLocaleString("fr-FR")}
                </div>
              </li>
            ))}
            {recentActivity.length === 0 && <li style={{ color: "#a79ec2", fontSize: "0.85rem" }}>Aucune activité récente.</li>}
          </ul>
        </div>
      </div>
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
const searchInputStyle: CSSProperties = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 6,
  padding: "6px 10px",
  color: "#f4f2fa",
  fontSize: "0.85rem",
};
const sortSelectStyle: CSSProperties = { ...searchInputStyle };
const planSelectStyle: CSSProperties = { ...searchInputStyle, padding: "4px 6px", fontSize: "0.8rem" };
const filterButtonStyle: CSSProperties = {
  background: "#7c3aed",
  border: "none",
  borderRadius: 6,
  padding: "6px 14px",
  color: "white",
  cursor: "pointer",
  fontSize: "0.85rem",
};
const smallButtonStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid #7c3aed",
  color: "#c4b5fd",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: "0.75rem",
};
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
