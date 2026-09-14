import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getTransactionHistory } from "@discord-rp/core";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";

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

export async function executeHistorique(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const character = await requireActiveCharacter(interaction.guildId!, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  const transactions = await getTransactionHistory(interaction.guildId!, character.id, 10);
  if (transactions.length === 0) {
    await interaction.reply({ content: "Aucune transaction pour l'instant.", ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Historique — ${character.firstName} ${character.lastName}`)
    .setColor(0x7c3aed)
    .setDescription(
      transactions
        .map((t) => {
          const sign = t.toCharacterId === character.id ? "+" : "-";
          return `${TYPE_LABELS[t.type] ?? t.type} — ${sign}${formatCents(t.amountCents)} (${t.createdAt.toLocaleDateString("fr-FR")})`;
        })
        .join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
