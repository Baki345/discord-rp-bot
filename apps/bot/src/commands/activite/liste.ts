import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listActivities } from "@discord-rp/core";

export async function executeListe(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const activities = await listActivities(interaction.guildId!);

  const embed = new EmbedBuilder()
    .setTitle("🎣 Activités du serveur")
    .setColor(0x7c3aed)
    .setDescription(
      activities.length === 0
        ? "Aucune activité pour l'instant."
        : activities
            .map(
              (a) =>
                `**${a.name}** — ${(a.rewardCashMinCents / 100).toFixed(2)} $ à ${(a.rewardCashMaxCents / 100).toFixed(2)} $ (recharge : ${a.cooldownMinutes} min)`,
            )
            .join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
