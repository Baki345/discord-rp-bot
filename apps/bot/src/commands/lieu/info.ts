import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getPlace, ServiceError } from "@discord-rp/core";

export async function executeInfo(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const placeId = interaction.options.getString("lieu", true);

  try {
    const place = await getPlace(interaction.guildId!, placeId);
    const embed = new EmbedBuilder()
      .setTitle(`📍 ${place.name}`)
      .setColor(0x7c3aed)
      .setDescription(place.description ?? "Aucune description.")
      .addFields(
        { name: "Catégorie", value: place.category ?? "—", inline: true },
        {
          name: "Propriétaire",
          value: place.ownerCharacter
            ? `${place.ownerCharacter.firstName} ${place.ownerCharacter.lastName}`
            : (place.company?.name ?? "Aucun"),
          inline: true,
        },
      );
    if (place.imageUrl) embed.setImage(place.imageUrl);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Ce lieu n'existe pas.", ephemeral: true });
      return;
    }
    throw e;
  }
}
