import { prisma } from "@discord-rp/database";

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "🏦 Dépôt",
  WITHDRAW: "💵 Retrait",
  TRANSFER_CASH: "🤝 Paiement (liquide)",
  TRANSFER_BANK: "🏦 Virement",
  SALARY: "💼 Salaire",
  FINE: "🚨 Amende",
  SHOP_PURCHASE: "🛒 Achat",
  SHOP_SALE: "💰 Vente",
  VEHICLE_PURCHASE: "🚗 Achat véhicule",
  ADMIN_ADJUSTMENT: "🛠️ Ajustement admin",
};

export default async function TransactionsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const transactions = await prisma.transaction.findMany({
    where: { guildId },
    include: { fromCharacter: true, toCharacter: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Transactions</h1>
      <p style={{ color: "#a79ec2" }}>Les 50 plus récentes.</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Type</th>
            <th style={{ padding: "8px 4px" }}>De</th>
            <th style={{ padding: "8px 4px" }}>Vers</th>
            <th style={{ padding: "8px 4px" }}>Montant</th>
            <th style={{ padding: "8px 4px" }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>{TYPE_LABELS[t.type] ?? t.type}</td>
              <td style={{ padding: "8px 4px" }}>
                {t.fromCharacter ? `${t.fromCharacter.firstName} ${t.fromCharacter.lastName}` : "—"}
              </td>
              <td style={{ padding: "8px 4px" }}>{t.toCharacter ? `${t.toCharacter.firstName} ${t.toCharacter.lastName}` : "—"}</td>
              <td style={{ padding: "8px 4px" }}>{(t.amountCents / 100).toFixed(2)} $</td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>{t.createdAt.toLocaleString("fr-FR")}</td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucune transaction pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
