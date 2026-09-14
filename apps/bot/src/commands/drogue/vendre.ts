import type { ChatInputCommandInteraction } from "discord.js";
import { sellDrug, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeVendre(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const drugTypeId = interaction.options.getString("substance", true);
  const quantity = interaction.options.getInteger("quantite", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const result = await sellDrug(actor, {
      guildId: actor.guildId,
      characterId: character.id,
      drugTypeId,
      quantity,
      discordChannelId: interaction.channelId,
    });
    await interaction.reply({
      content: result.arrested
        ? `💰 Vendu pour **${formatCents(result.totalCents)}**... mais tu t'es fait arrêter — en prison jusqu'à <t:${Math.floor((result.jailedUntil?.getTime() ?? Date.now()) / 1000)}:R>.`
        : `✅ Vendu pour **${formatCents(result.totalCents)}**.`,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "VALIDATION_ERROR") {
      await interaction.reply({ content: e.message, ephemeral: true });
      return;
    }
    throw e;
  }
}
