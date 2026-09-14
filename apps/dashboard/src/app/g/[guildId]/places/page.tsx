import type { CSSProperties } from "react";
import { prisma } from "@discord-rp/database";
import { createPlaceAction, deletePlaceAction } from "./actions";

export default async function PlacesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const places = await prisma.place.findMany({
    where: { guildId },
    include: { ownerCharacter: true, company: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Lieux</h1>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Nom</th>
            <th style={{ padding: "8px 4px" }}>Catégorie</th>
            <th style={{ padding: "8px 4px" }}>Propriétaire</th>
            <th style={{ padding: "8px 4px" }} />
          </tr>
        </thead>
        <tbody>
          {places.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>{p.name}</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{p.category ?? "—"}</td>
              <td style={{ padding: "8px 4px" }}>
                {p.ownerCharacter ? `${p.ownerCharacter.firstName} ${p.ownerCharacter.lastName}` : (p.company?.name ?? "—")}
              </td>
              <td style={{ padding: "8px 4px" }}>
                <form action={deletePlaceAction.bind(null, guildId, p.id)}>
                  <button type="submit" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
                    Supprimer
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {places.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucun lieu pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Créer un lieu</h2>
      <form action={createPlaceAction.bind(null, guildId)} style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <input name="name" placeholder="Nom" required style={inputStyle} />
        <input name="category" placeholder="Catégorie (optionnel)" style={inputStyle} />
        <input name="description" placeholder="Description (optionnel)" style={inputStyle} />
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
};
