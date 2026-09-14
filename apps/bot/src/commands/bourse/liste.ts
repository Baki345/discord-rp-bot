import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listMarket } from "@discord-rp/core";

export async function executeListe(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const market = await listMarket(interaction.guildId!);

  const embed = new EmbedBuilder()
    .setTitle("📈 Bourse")
    .setColor(0x7c3aed)
    .setDescription(
      market.length === 0
        ? "Aucune entreprise cotée pour l'instant."
        : market.map((c) => `**${c.name}** — ${((c.sharePriceCents ?? 0) / 100).toFixed(2)} $/action`).join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
