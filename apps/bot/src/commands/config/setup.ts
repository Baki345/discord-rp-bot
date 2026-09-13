import type { ChatInputCommandInteraction } from "discord.js";
import { ensureGuild } from "@discord-rp/core";

export async function executeSetup(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "Cette commande doit être utilisée dans un serveur.", ephemeral: true });
    return;
  }

  const { guild, config } = await ensureGuild({
    guildId: interaction.guild.id,
    name: interaction.guild.name,
    ownerDiscordId: interaction.guild.ownerId,
    iconUrl: interaction.guild.iconURL() ?? undefined,
  });

  await interaction.reply({
    content: `✅ Configuration RP initialisée pour **${guild.name}** — argent de départ : ${(
      config.startingCashCents / 100
    ).toFixed(2)} $.`,
    ephemeral: true,
  });
}
