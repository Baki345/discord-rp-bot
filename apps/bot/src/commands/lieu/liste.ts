import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listPlaces } from "@discord-rp/core";

export async function executeListe(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const places = await listPlaces(interaction.guildId!);

  const embed = new EmbedBuilder()
    .setTitle("📍 Lieux du serveur")
    .setColor(0x7c3aed)
    .setDescription(
      places.length === 0
        ? "Aucun lieu pour l'instant."
        : places.map((p) => `**${p.name}**${p.category ? ` — ${p.category}` : ""}`).join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
