import type { ChatInputCommandInteraction } from "discord.js";
import { getBankAccount } from "@discord-rp/core";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";

export async function executeSolde(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const character = await requireActiveCharacter(interaction.guildId!, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  const account = await getBankAccount(interaction.guildId!, character.id);
  await interaction.reply({
    content: `💵 Liquide : **${formatCents(character.cashCents)}**\n🏦 Banque : **${formatCents(account.balanceCents)}**`,
    ephemeral: true,
  });
}
