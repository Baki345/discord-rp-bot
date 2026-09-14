import type { ChatInputCommandInteraction } from "discord.js";
import { revokeVehicleKey, getActiveCharacter, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeVehiculeRetirer(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const vehicleId = interaction.options.getString("vehicule", true);
  const targetUser = interaction.options.getUser("joueur", true);

  const holder = await getActiveCharacter(actor.guildId, targetUser.id);
  if (!holder) {
    await interaction.reply({ content: `${targetUser} n'a pas de personnage actif dans ce serveur.`, ephemeral: true });
    return;
  }

  try {
    await revokeVehicleKey(actor, { guildId: actor.guildId, vehicleId, characterId: holder.id });
    await interaction.reply({ content: `🔑 Clé retirée à **${holder.firstName} ${holder.lastName}**.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "FORBIDDEN" || e.code === "NOT_FOUND")) {
      await interaction.reply({ content: e.message || "Tu n'es pas propriétaire de ce véhicule.", ephemeral: true });
      return;
    }
    throw e;
  }
}
