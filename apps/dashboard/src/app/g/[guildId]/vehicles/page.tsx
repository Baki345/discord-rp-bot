import type { CSSProperties } from "react";
import { prisma } from "@discord-rp/database";
import { createVehicleCategoryAction, createVehicleModelAction } from "./actions";

export default async function VehiclesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [categories, models, vehicles] = await Promise.all([
    prisma.vehicleCategory.findMany({ where: { guildId }, orderBy: { name: "asc" } }),
    prisma.vehicleModel.findMany({ where: { guildId }, include: { category: true }, orderBy: { name: "asc" } }),
    prisma.vehicle.findMany({ where: { guildId }, include: { model: true, ownerCharacter: true } }),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Véhicules</h1>

      <h2 style={{ fontSize: "1.1rem", marginTop: 24 }}>Véhicules en circulation ({vehicles.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Modèle</th>
            <th style={{ padding: "8px 4px" }}>Plaque</th>
            <th style={{ padding: "8px 4px" }}>Propriétaire</th>
            <th style={{ padding: "8px 4px" }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>{v.model.name}</td>
              <td style={{ padding: "8px 4px" }}>{v.plate}</td>
              <td style={{ padding: "8px 4px" }}>
                {v.ownerCharacter ? `${v.ownerCharacter.firstName} ${v.ownerCharacter.lastName}` : "—"}
              </td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{v.status}</td>
            </tr>
          ))}
          {vehicles.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucun véhicule vendu pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Catalogue</h2>
      <ul style={{ marginTop: 8 }}>
        {models.map((m) => (
          <li key={m.id}>
            {m.name} ({m.category.name}) — {(m.priceCents / 100).toFixed(2)} $
          </li>
        ))}
        {models.length === 0 && <li style={{ color: "#a79ec2", listStyle: "none" }}>Aucun modèle configuré.</li>}
      </ul>

      <div style={{ display: "flex", gap: 40, marginTop: 24, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontSize: "0.95rem" }}>Nouvelle catégorie</h3>
          <form action={createVehicleCategoryAction.bind(null, guildId)} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 240 }}>
            <input name="key" placeholder="Identifiant (ex. sedan)" required style={inputStyle} />
            <input name="name" placeholder="Nom affiché (ex. Berline)" required style={inputStyle} />
            <button type="submit" style={buttonStyle}>
              Créer
            </button>
          </form>
        </div>

        <div>
          <h3 style={{ fontSize: "0.95rem" }}>Nouveau modèle</h3>
          <form action={createVehicleModelAction.bind(null, guildId)} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 240 }}>
            <select name="categoryId" required style={inputStyle}>
              <option value="">Catégorie…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input name="name" placeholder="Nom du modèle" required style={inputStyle} />
            <input name="brand" placeholder="Marque (optionnel)" style={inputStyle} />
            <input name="price" type="number" step="0.01" min="0" placeholder="Prix ($)" required style={inputStyle} />
            <button type="submit" style={buttonStyle}>
              Créer
            </button>
          </form>
        </div>
      </div>
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
