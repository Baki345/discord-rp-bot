import type { ChatInputCommandInteraction } from "discord.js";
import { attemptRobbery, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeTenter(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const targetId = interaction.options.getString("cible", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const result = await attemptRobbery(actor, {
      guildId: actor.guildId,
      characterId: character.id,
      targetId,
      discordChannelId: interaction.channelId,
    });
    await interaction.reply({
      content: result.success
        ? `✅ Braquage réussi ! Tu empoches **${formatCents(result.rewardCents)}**.`
        : `🚨 Braquage raté — tu es arrêté et en prison jusqu'à <t:${Math.floor((result.jailedUntil?.getTime() ?? Date.now()) / 1000)}:R>.`,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "VALIDATION_ERROR") {
      await interaction.reply({ content: e.message, ephemeral: true });
      return;
    }
    throw e;
  }
}
