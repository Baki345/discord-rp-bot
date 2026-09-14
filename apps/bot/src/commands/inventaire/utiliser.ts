import type { ChatInputCommandInteraction } from "discord.js";
import { consumeInventoryItem, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeUtiliser(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const itemId = interaction.options.getString("article", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const result = await consumeInventoryItem(actor, { guildId: actor.guildId, characterId: character.id, itemId });
    const parts: string[] = [];
    if (result.hunger != null) parts.push(`🍗 Faim : ${result.hunger}/100`);
    if (result.thirst != null) parts.push(`💧 Soif : ${result.thirst}/100`);
    await interaction.reply({
      content: `✅ Utilisé.${parts.length > 0 ? ` ${parts.join(" — ")}` : ""}`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "VALIDATION_ERROR" || e.code === "NOT_FOUND")) {
      await interaction.reply({ content: e.message, ephemeral: true });
      return;
    }
    throw e;
  }
}
