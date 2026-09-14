import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listLicenses, listCharacterLicenses } from "@discord-rp/core";
import { requireActiveCharacter } from "../../lib/require-active-character.js";

export async function executeListe(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const licenses = await listLicenses(interaction.guildId!);
  const character = await requireActiveCharacter(interaction.guildId!, interaction.user.id);
  const held = character ? new Set((await listCharacterLicenses(character.id)).map((cl) => cl.licenseId)) : new Set();

  const embed = new EmbedBuilder()
    .setTitle("📋 Permis du serveur")
    .setColor(0x7c3aed)
    .setDescription(
      licenses.length === 0
        ? "Aucun permis pour l'instant."
        : licenses
            .map((l) => `${held.has(l.id) ? "✅" : "▫️"} **${l.name}** — ${l.questions.length} question(s), ${l.passScorePct}% pour réussir`)
            .join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
