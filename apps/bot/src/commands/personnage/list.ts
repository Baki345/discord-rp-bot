import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listCharacters } from "@discord-rp/core";

export async function executeList(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const characters = await listCharacters(interaction.guildId!, interaction.user.id);

  if (characters.length === 0) {
    await interaction.reply({ content: "Tu n'as pas encore de personnage — utilise `/personnage create`.", ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Tes personnages")
    .setColor(0x7c3aed)
    .setDescription(
      characters
        .map((c) => `${c.isActiveForUser ? "🟢" : "⚪"} **${c.firstName} ${c.lastName}** — ${(c.cashCents / 100).toFixed(2)} $`)
        .join("\n"),
    )
    .setFooter({ text: "🟢 = personnage actif" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
