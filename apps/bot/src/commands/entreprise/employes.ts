import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getCompany, ServiceError } from "@discord-rp/core";

export async function executeEmployes(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const companyId = interaction.options.getString("entreprise", true);

  try {
    const company = await getCompany(interaction.guildId!, companyId);
    const embed = new EmbedBuilder()
      .setTitle(`Employés — ${company.name}`)
      .setColor(0x7c3aed)
      .setDescription(
        company.employees.length === 0
          ? "Aucun employé."
          : company.employees.map((e) => `**${e.character.firstName} ${e.character.lastName}** — ${e.grade.name}`).join("\n"),
      )
      .setFooter({ text: `Propriétaire : ${company.ownerCharacter.firstName} ${company.ownerCharacter.lastName}` });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Cette entreprise n'existe pas.", ephemeral: true });
      return;
    }
    throw e;
  }
}
