import type { ChatInputCommandInteraction } from "discord.js";
import { craftItem, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeFabriquer(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const recipeId = interaction.options.getString("recette", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const result = await craftItem(actor, {
      guildId: actor.guildId,
      characterId: character.id,
      recipeId,
      discordChannelId: interaction.channelId,
    });
    await interaction.reply({ content: `✅ Fabriqué : **${result.resultQuantity}× ${result.resultItemName}**.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "VALIDATION_ERROR" || e.code === "NOT_FOUND")) {
      await interaction.reply({ content: e.message, ephemeral: true });
      return;
    }
    throw e;
  }
}
