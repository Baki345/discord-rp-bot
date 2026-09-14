import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getPortfolio } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";

export async function executePortefeuille(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const character = await requireActiveCharacter(interaction.guildId!, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  const portfolio = await getPortfolio(character.id);
  const embed = new EmbedBuilder()
    .setTitle(`📊 Portefeuille — ${character.firstName} ${character.lastName}`)
    .setColor(0x7c3aed)
    .setDescription(
      portfolio.length === 0
        ? "Aucune action détenue."
        : portfolio
            .map((s) => {
              const price = s.company.sharePriceCents ?? 0;
              return `**${s.company.name}** — ${s.quantity} action(s) — ${((price * s.quantity) / 100).toFixed(2)} $`;
            })
            .join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
