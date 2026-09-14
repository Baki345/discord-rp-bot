import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listInventory } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";

export async function executeVoir(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const character = await requireActiveCharacter(interaction.guildId!, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  const items = await listInventory(interaction.guildId!, character.id);
  const embed = new EmbedBuilder()
    .setTitle(`🎒 Inventaire — ${character.firstName} ${character.lastName}`)
    .setColor(0x7c3aed)
    .setDescription(
      items.length === 0
        ? "Ton inventaire est vide."
        : items.map((i) => `**${i.item.name}** × ${i.quantity}${i.item.isConsumable ? " (consommable)" : ""}`).join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
