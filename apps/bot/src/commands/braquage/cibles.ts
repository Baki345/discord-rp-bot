import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listRobberyTargets } from "@discord-rp/core";

export async function executeCibles(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const targets = await listRobberyTargets(interaction.guildId!);

  const embed = new EmbedBuilder()
    .setTitle("🎯 Cibles de braquage")
    .setColor(0x7c3aed)
    .setDescription(
      targets.length === 0
        ? "Aucune cible pour l'instant."
        : targets
            .map(
              (t) =>
                `**${t.name}** — ${(t.rewardMinCents / 100).toFixed(2)} $ à ${(t.rewardMaxCents / 100).toFixed(2)} $ — ${t.successChancePct}% de réussite — recharge ${t.cooldownMinutes} min${t.minPoliceOnDuty > 0 ? ` — ${t.minPoliceOnDuty} policier(s) en service requis` : ""}`,
            )
            .join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
