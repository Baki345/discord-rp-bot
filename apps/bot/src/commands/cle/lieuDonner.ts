import type { ChatInputCommandInteraction } from "discord.js";
import { grantPlaceKey, getActiveCharacter, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeLieuDonner(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const placeId = interaction.options.getString("lieu", true);
  const targetUser = interaction.options.getUser("joueur", true);

  const recipient = await getActiveCharacter(actor.guildId, targetUser.id);
  if (!recipient) {
    await interaction.reply({ content: `${targetUser} n'a pas de personnage actif dans ce serveur.`, ephemeral: true });
    return;
  }

  try {
    await grantPlaceKey(actor, { guildId: actor.guildId, placeId, characterId: recipient.id });
    await interaction.reply({ content: `🔑 Clé donnée à **${recipient.firstName} ${recipient.lastName}**.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu n'es pas propriétaire de ce lieu.", ephemeral: true });
      return;
    }
    throw e;
  }
}
