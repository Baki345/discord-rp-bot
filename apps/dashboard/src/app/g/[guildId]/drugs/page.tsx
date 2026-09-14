import type { CSSProperties } from "react";
import { prisma } from "@discord-rp/database";
import { createDrugTypeAction } from "./actions";

export default async function DrugsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [drugTypes, items] = await Promise.all([
    prisma.drugType.findMany({ where: { guildId }, include: { linkedItem: true }, orderBy: { name: "asc" } }),
    prisma.item.findMany({ where: { guildId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Drogues</h1>
      <p style={{ color: "#a79ec2" }}>Nécessite la fonctionnalité &quot;drugs&quot; activée sur le plan du serveur.</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Substance</th>
            <th style={{ padding: "8px 4px" }}>Objet lié</th>
            <th style={{ padding: "8px 4px" }}>Prix de vente</th>
            <th style={{ padding: "8px 4px" }}>Risque</th>
          </tr>
        </thead>
        <tbody>
          {drugTypes.map((d) => (
            <tr key={d.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>{d.name}</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{d.linkedItem.name}</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>
                {(d.sellPriceMinCents / 100).toFixed(2)} $ – {(d.sellPriceMaxCents / 100).toFixed(2)} $
              </td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{d.arrestChancePct}%</td>
            </tr>
          ))}
          {drugTypes.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucune substance pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Créer une substance</h2>
      {items.length === 0 ? (
        <p style={{ color: "#a79ec2" }}>Crée d&apos;abord un objet dans l&apos;Item Builder.</p>
      ) : (
        <form action={createDrugTypeAction.bind(null, guildId)} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, maxWidth: 420 }}>
          <input name="key" placeholder="Identifiant (ex. herbe)" required style={inputStyle} />
          <input name="name" placeholder="Nom affiché" required style={inputStyle} />
          <select name="linkedItemId" required style={inputStyle}>
            <option value="">Objet lié…</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
          <input name="cooldownMinutes" type="number" min="1" placeholder="Recharge de production (minutes)" defaultValue={20} style={inputStyle} />
          <input name="sellPriceMin" type="number" step="0.01" min="0" placeholder="Prix min/unité ($)" style={inputStyle} />
          <input name="sellPriceMax" type="number" step="0.01" min="0" placeholder="Prix max/unité ($)" style={inputStyle} />
          <input name="arrestChancePct" type="number" min="0" max="100" placeholder="% risque d'arrestation" defaultValue={10} style={inputStyle} />
          <input name="arrestJailMinutes" type="number" min="0" placeholder="Minutes de prison si arrêté" defaultValue={20} style={inputStyle} />
          <button type="submit" style={buttonStyle}>
            Créer
          </button>
        </form>
      )}
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
