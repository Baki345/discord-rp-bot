import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listOwnedVehicles } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";

const STATUS_LABELS: Record<string, string> = {
  GARAGED: "🏠 Au garage",
  IMPOUNDED: "🚨 Mis en fourrière",
  DESTROYED: "💥 Détruit",
  IN_USE: "🚗 En circulation",
};

export async function executeGarage(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const character = await requireActiveCharacter(interaction.guildId!, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  const vehicles = await listOwnedVehicles(interaction.guildId!, character.id);
  if (vehicles.length === 0) {
    await interaction.reply({ content: "Tu n'as pas encore de véhicule — utilise `/vehicule acheter`.", ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Garage — ${character.firstName} ${character.lastName}`)
    .setColor(0x7c3aed)
    .setDescription(
      vehicles
        .map((v) => `**${v.model.name}** — ${v.plate} — ${STATUS_LABELS[v.status] ?? v.status} — ⛽ ${v.fuel}% — 🔧 ${v.condition}%`)
        .join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
