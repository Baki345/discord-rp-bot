import type { ChatInputCommandInteraction } from "discord.js";
import { grantVehicleKey, getActiveCharacter, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeVehiculeDonner(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const vehicleId = interaction.options.getString("vehicule", true);
  const targetUser = interaction.options.getUser("joueur", true);

  const recipient = await getActiveCharacter(actor.guildId, targetUser.id);
  if (!recipient) {
    await interaction.reply({ content: `${targetUser} n'a pas de personnage actif dans ce serveur.`, ephemeral: true });
    return;
  }

  try {
    await grantVehicleKey(actor, { guildId: actor.guildId, vehicleId, characterId: recipient.id });
    await interaction.reply({ content: `🔑 Clé donnée à **${recipient.firstName} ${recipient.lastName}**.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu n'es pas propriétaire de ce véhicule.", ephemeral: true });
      return;
    }
    throw e;
  }
}
