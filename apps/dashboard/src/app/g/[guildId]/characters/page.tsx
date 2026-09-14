import type { CSSProperties } from "react";
import { prisma } from "@discord-rp/database";
import { createCharacterAction, deleteCharacterAction } from "./actions";

export default async function CharactersPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const characters = await prisma.character.findMany({
    where: { guildId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Personnages</h1>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Nom</th>
            <th style={{ padding: "8px 4px" }}>Propriétaire (Discord ID)</th>
            <th style={{ padding: "8px 4px" }}>Liquide</th>
            <th style={{ padding: "8px 4px" }}>Statut</th>
            <th style={{ padding: "8px 4px" }} />
          </tr>
        </thead>
        <tbody>
          {characters.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>
                <a href={`/g/${guildId}/characters/${c.id}`} style={{ color: "#c4b5fd" }}>
                  {c.firstName} {c.lastName}
                </a>
              </td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{c.discordUserId}</td>
              <td style={{ padding: "8px 4px" }}>{(c.cashCents / 100).toFixed(2)} $</td>
              <td style={{ padding: "8px 4px" }}>{c.status}</td>
              <td style={{ padding: "8px 4px" }}>
                <form action={deleteCharacterAction.bind(null, guildId, c.id)}>
                  <button type="submit" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
                    Supprimer
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {characters.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucun personnage pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Créer un personnage pour un joueur</h2>
      <form
        action={createCharacterAction.bind(null, guildId)}
        style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
      >
        <input name="discordUserId" placeholder="ID Discord du joueur" required style={inputStyle} />
        <input name="firstName" placeholder="Prénom" required style={inputStyle} />
        <input name="lastName" placeholder="Nom" required style={inputStyle} />
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
