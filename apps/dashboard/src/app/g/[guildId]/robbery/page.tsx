import type { CSSProperties } from "react";
import { prisma } from "@discord-rp/database";
import { createRobberyTargetAction } from "./actions";

export default async function RobberyPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const targets = await prisma.robberyTarget.findMany({ where: { guildId }, orderBy: { name: "asc" } });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Braquages</h1>
      <p style={{ color: "#a79ec2" }}>Nécessite la fonctionnalité &quot;robbery&quot; activée sur le plan du serveur.</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Cible</th>
            <th style={{ padding: "8px 4px" }}>Récompense</th>
            <th style={{ padding: "8px 4px" }}>Réussite</th>
            <th style={{ padding: "8px 4px" }}>Police requise</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((t) => (
            <tr key={t.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>{t.name}</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>
                {(t.rewardMinCents / 100).toFixed(2)} $ – {(t.rewardMaxCents / 100).toFixed(2)} $
              </td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{t.successChancePct}%</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{t.minPoliceOnDuty}</td>
            </tr>
          ))}
          {targets.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucune cible pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Créer une cible</h2>
      <form action={createRobberyTargetAction.bind(null, guildId)} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, maxWidth: 420 }}>
        <input name="key" placeholder="Identifiant (ex. banque_centrale)" required style={inputStyle} />
        <input name="name" placeholder="Nom affiché" required style={inputStyle} />
        <input name="rewardMin" type="number" step="0.01" min="0" placeholder="Récompense min ($)" style={inputStyle} />
        <input name="rewardMax" type="number" step="0.01" min="0" placeholder="Récompense max ($)" style={inputStyle} />
        <input name="cooldownMinutes" type="number" min="1" placeholder="Recharge (minutes)" defaultValue={60} style={inputStyle} />
        <input name="successChancePct" type="number" min="1" max="100" placeholder="% de réussite" defaultValue={50} style={inputStyle} />
        <input name="minPoliceOnDuty" type="number" min="0" placeholder="Policiers en service requis" defaultValue={0} style={inputStyle} />
        <input name="jailMinutes" type="number" min="0" placeholder="Minutes de prison si échec" defaultValue={15} style={inputStyle} />
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
