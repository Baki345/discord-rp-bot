import Link from "next/link";
import { prisma } from "@discord-rp/database";
import { adjustDepositAction, adjustWithdrawAction } from "./actions";

export default async function EconomyPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const characters = await prisma.character.findMany({
    where: { guildId, deletedAt: null },
    include: { bankAccounts: { where: { type: "PERSONAL" } } },
    orderBy: { createdAt: "asc" },
  });

  const totalCash = characters.reduce((sum, c) => sum + c.cashCents, 0);
  const totalBank = characters.reduce((sum, c) => sum + (c.bankAccounts[0]?.balanceCents ?? 0), 0);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Économie</h1>

      <div style={{ display: "flex", gap: 16, margin: "20px 0" }}>
        <div style={cardStyle}>
          <div style={{ color: "#a79ec2", fontSize: "0.85rem" }}>Liquide en circulation</div>
          <div style={{ fontSize: "1.3rem" }}>{(totalCash / 100).toFixed(2)} $</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: "#a79ec2", fontSize: "0.85rem" }}>En banque</div>
          <div style={{ fontSize: "1.3rem" }}>{(totalBank / 100).toFixed(2)} $</div>
        </div>
      </div>

      <p>
        <Link href={`/g/${guildId}/economy/transactions`} style={{ color: "#c4b5fd" }}>
          Voir toutes les transactions →
        </Link>
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Personnage</th>
            <th style={{ padding: "8px 4px" }}>Liquide</th>
            <th style={{ padding: "8px 4px" }}>Banque</th>
            <th style={{ padding: "8px 4px" }}>Ajustement admin</th>
          </tr>
        </thead>
        <tbody>
          {characters.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>
                {c.firstName} {c.lastName}
              </td>
              <td style={{ padding: "8px 4px" }}>{(c.cashCents / 100).toFixed(2)} $</td>
              <td style={{ padding: "8px 4px" }}>{((c.bankAccounts[0]?.balanceCents ?? 0) / 100).toFixed(2)} $</td>
              <td style={{ padding: "8px 4px", display: "flex", gap: 6 }}>
                <form action={adjustDepositAction.bind(null, guildId, c.id)} style={{ display: "flex", gap: 4 }}>
                  <input name="amount" type="number" step="0.01" min="0.01" required style={amountInputStyle} />
                  <button type="submit" title="Déposer (liquide -> banque)" style={miniButtonStyle}>
                    ➕🏦
                  </button>
                </form>
                <form action={adjustWithdrawAction.bind(null, guildId, c.id)} style={{ display: "flex", gap: 4 }}>
                  <input name="amount" type="number" step="0.01" min="0.01" required style={amountInputStyle} />
                  <button type="submit" title="Retirer (banque -> liquide)" style={miniButtonStyle}>
                    ➖🏦
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cardStyle = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 12,
  padding: "16px 20px",
  minWidth: 160,
};

const amountInputStyle = {
  width: 70,
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 6,
  padding: "4px 6px",
  color: "#f4f2fa",
};

const miniButtonStyle = {
  background: "#2a2340",
  border: "none",
  borderRadius: 6,
  padding: "4px 8px",
  color: "#f4f2fa",
  cursor: "pointer",
};
