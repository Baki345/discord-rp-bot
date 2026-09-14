import type { ChatInputCommandInteraction } from "discord.js";
import { getCompany, ServiceError } from "@discord-rp/core";
import { formatCents } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeTreso(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const companyId = interaction.options.getString("entreprise", true);

  try {
    const company = await getCompany(actor.guildId, companyId);
    if (actor.discordUserId !== company.ownerCharacter.discordUserId && !actor.isDiscordGuildAdmin) {
      await interaction.reply({ content: "Seul·e le/la propriétaire de l'entreprise peut voir sa trésorerie.", ephemeral: true });
      return;
    }
    await interaction.reply({
      content: `🏦 Trésorerie de **${company.name}** : **${formatCents(company.treasuryAccount?.balanceCents ?? 0)}**.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Cette entreprise n'existe pas.", ephemeral: true });
      return;
    }
    throw e;
  }
}
