import type { ChatInputCommandInteraction } from "discord.js";
import { attemptActivity, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeTenter(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const activityId = interaction.options.getString("activite", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const result = await attemptActivity(actor, {
      guildId: actor.guildId,
      characterId: character.id,
      activityId,
      discordChannelId: interaction.channelId,
    });
    const itemPart = result.rewardItemId ? ` et ${result.rewardItemQty} objet(s)` : "";
    await interaction.reply({ content: `✅ Tu gagnes **${formatCents(result.rewardCents)}**${itemPart}.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "VALIDATION_ERROR" || e.code === "NOT_FOUND")) {
      await interaction.reply({ content: e.message, ephemeral: true });
      return;
    }
    throw e;
  }
}
