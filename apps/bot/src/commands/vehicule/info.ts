import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getVehicle, ServiceError } from "@discord-rp/core";

export async function executeInfo(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const vehicleId = interaction.options.getString("vehicule", true);

  try {
    const vehicle = await getVehicle(interaction.guildId!, vehicleId);
    const embed = new EmbedBuilder()
      .setTitle(`${vehicle.model.name} — ${vehicle.plate}`)
      .setColor(0x7c3aed)
      .addFields(
        { name: "Catégorie", value: vehicle.model.category.name, inline: true },
        { name: "Statut", value: vehicle.status, inline: true },
        { name: "Carburant", value: `${vehicle.fuel}%`, inline: true },
        { name: "État", value: `${vehicle.condition}%`, inline: true },
        { name: "Kilométrage", value: `${vehicle.mileage} km`, inline: true },
        { name: "Propriétaire", value: `${vehicle.ownerCharacter?.firstName ?? "—"} ${vehicle.ownerCharacter?.lastName ?? ""}`, inline: true },
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Ce véhicule n'existe pas.", ephemeral: true });
      return;
    }
    throw e;
  }
}
