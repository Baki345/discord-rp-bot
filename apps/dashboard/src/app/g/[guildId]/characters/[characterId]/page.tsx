import { notFound } from "next/navigation";
import { prisma } from "@discord-rp/database";

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ guildId: string; characterId: string }>;
}) {
  const { guildId, characterId } = await params;
  const character = await prisma.character.findFirst({
    where: { id: characterId, guildId },
    include: { bankAccounts: true, inventoryItems: { include: { item: true } }, jobMembership: { include: { job: true, grade: true } } },
  });
  if (!character) notFound();

  const personalAccount = character.bankAccounts.find((a) => a.type === "PERSONAL");

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>
        {character.firstName} {character.lastName}
      </h1>
      <p style={{ color: "#a79ec2" }}>
        Propriétaire Discord : {character.discordUserId} — Statut : {character.status}
      </p>

      <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
        <div style={cardStyle}>
          <div style={{ color: "#a79ec2", fontSize: "0.85rem" }}>Liquide</div>
          <div style={{ fontSize: "1.3rem" }}>{(character.cashCents / 100).toFixed(2)} $</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: "#a79ec2", fontSize: "0.85rem" }}>Banque</div>
          <div style={{ fontSize: "1.3rem" }}>{((personalAccount?.balanceCents ?? 0) / 100).toFixed(2)} $</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: "#a79ec2", fontSize: "0.85rem" }}>Métier</div>
          <div style={{ fontSize: "1.3rem" }}>{character.jobMembership?.job.name ?? "Aucun"}</div>
        </div>
      </div>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Inventaire</h2>
      {character.inventoryItems.length === 0 ? (
        <p style={{ color: "#a79ec2" }}>Vide.</p>
      ) : (
        <ul>
          {character.inventoryItems.map((entry) => (
            <li key={entry.id}>
              {entry.item.name} × {entry.quantity}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const cardStyle = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 12,
  padding: "16px 20px",
  minWidth: 140,
};
