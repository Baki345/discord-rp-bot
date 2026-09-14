import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getCharacter, ServiceError } from "@discord-rp/core";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  JAILED: "Incarcéré",
  HOSPITALIZED: "Hospitalisé",
  DEAD: "Décédé",
  ARCHIVED: "Archivé",
};

export async function executeInfo(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const characterId = interaction.options.getString("personnage", true);

  try {
    const character = await getCharacter(interaction.guildId!, characterId);
    const embed = new EmbedBuilder()
      .setTitle(`${character.firstName} ${character.lastName}`)
      .setColor(0x7c3aed)
      .addFields(
        { name: "Statut", value: STATUS_LABELS[character.status] ?? character.status, inline: true },
        { name: "Argent liquide", value: `${(character.cashCents / 100).toFixed(2)} $`, inline: true },
        { name: "Genre", value: character.gender ?? "—", inline: true },
        { name: "Nationalité", value: character.nationality ?? "—", inline: true },
        {
          name: "Date de naissance",
          value: character.dateOfBirth ? character.dateOfBirth.toLocaleDateString("fr-FR") : "—",
          inline: true,
        },
        { name: "Casier judiciaire", value: `${character.criminalRecordPoints} point(s)`, inline: true },
      );
    if (character.bio) embed.setDescription(character.bio);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Ce personnage n'existe pas (ou plus).", ephemeral: true });
      return;
    }
    throw e;
  }
}
