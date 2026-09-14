import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getLevelingConfig, listLeaderboard } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";

export const classementCommand: BotCommand = {
  data: new SlashCommandBuilder().setName("classement").setDescription("Voir le classement des niveaux du serveur"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const config = await getLevelingConfig(interaction.guildId!);
    if (!config.enabled) {
      await interaction.editReply("❌ Le système de niveaux n'est pas activé sur ce serveur.");
      return;
    }

    const top = await listLeaderboard(interaction.guildId!, 10);
    if (top.length === 0) {
      await interaction.editReply("Personne n'a encore gagné d'XP.");
      return;
    }

    const lines = top.map((entry, i) => `**${i + 1}.** <@${entry.discordUserId}> — niveau ${entry.level} (${entry.xp} XP)`);
    await interaction.editReply(`🏆 **Classement**\n\n${lines.join("\n")}`);
  },
};
