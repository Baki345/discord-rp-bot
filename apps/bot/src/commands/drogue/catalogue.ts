import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listDrugTypes } from "@discord-rp/core";

export async function executeCatalogue(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const drugTypes = await listDrugTypes(interaction.guildId!);

  const embed = new EmbedBuilder()
    .setTitle("💊 Substances")
    .setColor(0x7c3aed)
    .setDescription(
      drugTypes.length === 0
        ? "Aucune substance pour l'instant."
        : drugTypes
            .map(
              (d) =>
                `**${d.name}** (${d.linkedItem.name}) — ${(d.sellPriceMinCents / 100).toFixed(2)} $ à ${(d.sellPriceMaxCents / 100).toFixed(2)} $/unité — ${d.arrestChancePct}% de risque d'arrestation`,
            )
            .join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
