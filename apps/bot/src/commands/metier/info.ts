import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getJob, getCharacterJob, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";

export async function executeInfo(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const jobId = interaction.options.getString("metier");

  if (jobId) {
    try {
      const job = await getJob(interaction.guildId!, jobId);
      const embed = new EmbedBuilder()
        .setTitle(job.name)
        .setColor(0x7c3aed)
        .setDescription(job.description ?? "Aucune description.")
        .addFields({
          name: "Grades",
          value: job.grades.map((g) => `${g.name} — ${formatCents(g.salaryCents)}`).join("\n") || "Aucun",
        });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (e) {
      if (e instanceof ServiceError && e.code === "NOT_FOUND") {
        await interaction.reply({ content: "Ce métier n'existe pas.", ephemeral: true });
        return;
      }
      throw e;
    }
    return;
  }

  const character = await requireActiveCharacter(interaction.guildId!, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }
  const membership = await getCharacterJob(character.id);
  await interaction.reply({
    content: membership
      ? `**${character.firstName} ${character.lastName}** travaille comme **${membership.grade.name}** chez **${membership.job.name}** (${formatCents(membership.grade.salaryCents)}/versement).`
      : `**${character.firstName} ${character.lastName}** n'a pas de métier.`,
    ephemeral: true,
  });
}
