import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getMemberLevel, getLevelingConfig, xpProgressWithinLevel } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";

export const niveauCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("niveau")
    .setDescription("Voir ton niveau (ou celui d'un autre membre)")
    .addUserOption((opt) => opt.setName("membre").setDescription("Le membre (par défaut : toi)").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const target = interaction.options.getUser("membre") ?? interaction.user;

    const config = await getLevelingConfig(interaction.guildId!);
    if (!config.enabled) {
      await interaction.editReply("❌ Le système de niveaux n'est pas activé sur ce serveur.");
      return;
    }

    const level = await getMemberLevel(interaction.guildId!, target.id);
    if (!level) {
      await interaction.editReply(`ℹ️ **${target.tag}** n'a pas encore gagné d'XP.`);
      return;
    }

    const { currentLevelXp, neededForNextLevel } = xpProgressWithinLevel(level.xp, config.curveMultiplier);
    await interaction.editReply(
      `📈 **${target.tag}** — niveau **${level.level}** (${currentLevelXp}/${neededForNextLevel} XP vers le niveau suivant, ${level.xp} XP au total)`,
    );
  },
};
