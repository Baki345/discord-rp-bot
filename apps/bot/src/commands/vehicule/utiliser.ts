import type { ChatInputCommandInteraction } from "discord.js";
import { useVehicle, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeUtiliser(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const vehicleId = interaction.options.getString("vehicule", true);
  const action = interaction.options.getString("action", true) as "prendre" | "garer";

  try {
    await useVehicle(actor, { guildId: actor.guildId, vehicleId, inUse: action === "prendre" });
    await interaction.reply({
      content: action === "prendre" ? "🚗 Véhicule pris en circulation." : "🏠 Véhicule garé.",
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu n'as pas les clés de ce véhicule.", ephemeral: true });
      return;
    }
    throw e;
  }
}
