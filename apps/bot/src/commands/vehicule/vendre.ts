import type { ChatInputCommandInteraction } from "discord.js";
import { sellVehicle, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeVendre(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const vehicleId = interaction.options.getString("vehicule", true);

  try {
    const { refundCents } = await sellVehicle(actor, { guildId: actor.guildId, vehicleId });
    await interaction.reply({ content: `✅ Véhicule vendu pour **${(refundCents / 100).toFixed(2)} $**.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Ce n'est pas ton véhicule.", ephemeral: true });
      return;
    }
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Ce véhicule n'existe pas.", ephemeral: true });
      return;
    }
    throw e;
  }
}
