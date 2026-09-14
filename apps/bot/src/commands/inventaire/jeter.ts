import type { ChatInputCommandInteraction } from "discord.js";
import { discardItem, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeJeter(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const itemId = interaction.options.getString("article", true);
  const quantity = interaction.options.getInteger("quantite", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    await discardItem(actor, { guildId: actor.guildId, characterId: character.id, itemId, quantity });
    await interaction.reply({ content: "🗑️ Objet jeté.", ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "VALIDATION_ERROR") {
      await interaction.reply({ content: e.message, ephemeral: true });
      return;
    }
    throw e;
  }
}
