import type { CSSProperties } from "react";
import { prisma } from "@discord-rp/database";
import { createItemAction } from "./actions";

export default async function ItemsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const items = await prisma.item.findMany({ where: { guildId }, orderBy: { name: "asc" } });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Objets (Item Builder)</h1>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Nom</th>
            <th style={{ padding: "8px 4px" }}>Catégorie</th>
            <th style={{ padding: "8px 4px" }}>Prix</th>
            <th style={{ padding: "8px 4px" }}>Propriétés</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>{item.name}</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{item.category}</td>
              <td style={{ padding: "8px 4px" }}>{(item.priceCents / 100).toFixed(2)} $</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>
                {[
                  item.isStackable && "empilable",
                  item.isUsable && "utilisable",
                  item.isConsumable && "consommable",
                  item.isIllegal && "illégal",
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucun objet pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Créer un objet</h2>
      <form action={createItemAction.bind(null, guildId)} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, maxWidth: 420 }}>
        <input name="key" placeholder="Identifiant (ex. bandage)" required style={inputStyle} />
        <input name="name" placeholder="Nom affiché" required style={inputStyle} />
        <input name="category" placeholder="Catégorie (ex. medical)" required style={inputStyle} />
        <input name="description" placeholder="Description (optionnel)" style={inputStyle} />
        <input name="price" type="number" step="0.01" min="0" placeholder="Prix ($)" style={inputStyle} />
        <label style={checkboxLabelStyle}>
          <input type="checkbox" name="isStackable" defaultChecked /> Empilable
        </label>
        <label style={checkboxLabelStyle}>
          <input type="checkbox" name="isUsable" /> Utilisable
        </label>
        <label style={checkboxLabelStyle}>
          <input type="checkbox" name="isConsumable" /> Consommable
        </label>
        <label style={checkboxLabelStyle}>
          <input type="checkbox" name="isIllegal" /> Illégal
        </label>
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

const checkboxLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
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
