import type { ChatInputCommandInteraction } from "discord.js";
import { hasPlaceAccess, getPlace, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";

export async function executeEntrer(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const placeId = interaction.options.getString("lieu", true);

  const character = await requireActiveCharacter(interaction.guildId!, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const place = await getPlace(interaction.guildId!, placeId);
    const allowed = await hasPlaceAccess(interaction.guildId!, placeId, character.id);
    await interaction.reply({
      content: allowed ? `🚪 Tu entres dans **${place.name}**.` : `🔒 Accès refusé — **${place.name}** est verrouillé.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Ce lieu n'existe pas.", ephemeral: true });
      return;
    }
    throw e;
  }
}
