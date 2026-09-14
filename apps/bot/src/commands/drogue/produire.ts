import type { ChatInputCommandInteraction } from "discord.js";
import { produceDrug, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeProduire(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const drugTypeId = interaction.options.getString("substance", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const result = await produceDrug(actor, {
      guildId: actor.guildId,
      characterId: character.id,
      drugTypeId,
      discordChannelId: interaction.channelId,
    });
    await interaction.reply({ content: `✅ Production terminée : **${result.quantity}× ${result.itemName}**.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "VALIDATION_ERROR" || e.code === "NOT_FOUND")) {
      await interaction.reply({ content: e.message, ephemeral: true });
      return;
    }
    throw e;
  }
}
