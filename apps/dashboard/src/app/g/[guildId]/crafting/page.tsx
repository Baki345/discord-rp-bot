import type { CSSProperties } from "react";
import { prisma } from "@discord-rp/database";
import { createRecipeAction } from "./actions";

export default async function CraftingPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [recipes, items] = await Promise.all([
    prisma.craftingRecipe.findMany({
      where: { guildId },
      include: { ingredients: { include: { item: true } }, resultItem: true },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({ where: { guildId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Fabrication</h1>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Recette</th>
            <th style={{ padding: "8px 4px" }}>Produit</th>
            <th style={{ padding: "8px 4px" }}>Ingrédients</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>{r.name}</td>
              <td style={{ padding: "8px 4px" }}>
                {r.resultQuantity}× {r.resultItem.name}
              </td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>
                {r.ingredients.map((i) => `${i.quantity}× ${i.item.name}`).join(", ")}
              </td>
            </tr>
          ))}
          {recipes.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucune recette pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Créer une recette</h2>
      {items.length === 0 ? (
        <p style={{ color: "#a79ec2" }}>Crée d&apos;abord des objets dans l&apos;Item Builder.</p>
      ) : (
        <form action={createRecipeAction.bind(null, guildId)} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, maxWidth: 460 }}>
          <input name="key" placeholder="Identifiant (ex. bandage_improvise)" required style={inputStyle} />
          <input name="name" placeholder="Nom affiché" required style={inputStyle} />

          <label style={labelStyle}>
            Produit
            <div style={{ display: "flex", gap: 8 }}>
              <select name="resultItemId" required style={{ ...inputStyle, flex: 1 }}>
                <option value="">Objet produit…</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
              <input name="resultQuantity" type="number" min="1" defaultValue={1} style={{ ...inputStyle, width: 80 }} />
            </div>
          </label>

          <span style={{ color: "#a79ec2", fontSize: "0.85rem", marginTop: 6 }}>Ingrédients (jusqu&apos;à 3, laisse vide si inutile)</span>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ display: "flex", gap: 8 }}>
              <select name={`ingredientItem${n}`} style={{ ...inputStyle, flex: 1 }}>
                <option value="">—</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
              <input name={`ingredientQty${n}`} type="number" min="1" placeholder="Qté" style={{ ...inputStyle, width: 80 }} />
            </div>
          ))}

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

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "#f4f2fa",
  fontSize: "0.9rem",
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
