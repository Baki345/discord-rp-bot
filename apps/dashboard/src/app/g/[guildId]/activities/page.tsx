import type { CSSProperties } from "react";
import { prisma } from "@discord-rp/database";
import { createActivityAction } from "./actions";

export default async function ActivitiesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const activities = await prisma.activityDefinition.findMany({ where: { guildId }, orderBy: { name: "asc" } });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Activités</h1>
      <p style={{ color: "#a79ec2" }}>Boucles récompense/recharge génériques — pêche, mine, livraisons, etc.</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Nom</th>
            <th style={{ padding: "8px 4px" }}>Récompense</th>
            <th style={{ padding: "8px 4px" }}>Recharge</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>{a.name}</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>
                {(a.rewardCashMinCents / 100).toFixed(2)} $ – {(a.rewardCashMaxCents / 100).toFixed(2)} $
              </td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{a.cooldownMinutes} min</td>
            </tr>
          ))}
          {activities.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucune activité pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Créer une activité</h2>
      <form action={createActivityAction.bind(null, guildId)} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, maxWidth: 420 }}>
        <input name="key" placeholder="Identifiant (ex. peche)" required style={inputStyle} />
        <input name="name" placeholder="Nom affiché" required style={inputStyle} />
        <input name="cooldownMinutes" type="number" min="1" placeholder="Recharge (minutes)" defaultValue={30} style={inputStyle} />
        <input name="rewardMin" type="number" step="0.01" min="0" placeholder="Récompense min ($)" style={inputStyle} />
        <input name="rewardMax" type="number" step="0.01" min="0" placeholder="Récompense max ($)" style={inputStyle} />
        <button type="submit" style={buttonStyle}>
          Créer
        </button>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 6,
  padding: "8px 10px",
  color: "#f4f2fa",
};

const buttonStyle: CSSProperties = {
  background: "#7c3aed",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  color: "white",
  cursor: "pointer",
  alignSelf: "flex-start",
};
