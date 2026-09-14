import { AttachmentBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getMemberLevel, getLevelingConfig, xpProgressWithinLevel, setMemberCardBackground } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { renderRankCard } from "../../leveling/rankCard.js";

async function executeVoir(interaction: ChatInputCommandInteraction) {
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
}

async function executeCarte(interaction: ChatInputCommandInteraction) {
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
  const buffer = await renderRankCard({
    username: target.tag,
    avatarUrl: target.displayAvatarURL({ extension: "png", size: 256 }),
    level: level.level,
    currentLevelXp,
    neededForNextLevel,
    backgroundUrl: level.cardBackgroundUrl ?? config.defaultCardBackgroundUrl,
  });

  await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: "rank-card.png" })] });
}

async function executeCarteFond(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const url = interaction.options.getString("url");

  await setMemberCardBackground(interaction.user.id, interaction.guildId!, url);
  await interaction.editReply(url ? "✅ Fond de carte personnalisé enregistré." : "✅ Fond de carte réinitialisé (utilise le fond par défaut du serveur).");
}

export const niveauCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("niveau")
    .setDescription("Système de niveaux")
    .addSubcommand((sub) =>
      sub
        .setName("voir")
        .setDescription("Voir ton niveau (ou celui d'un autre membre) en texte")
        .addUserOption((opt) => opt.setName("membre").setDescription("Le membre (par défaut : toi)").setRequired(false)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("carte")
        .setDescription("Voir ta carte de niveau (ou celle d'un autre membre) en image")
        .addUserOption((opt) => opt.setName("membre").setDescription("Le membre (par défaut : toi)").setRequired(false)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("carte-fond")
        .setDescription("Personnaliser le fond de ta carte de niveau")
        .addStringOption((opt) => opt.setName("url").setDescription("URL de l'image (vide pour réinitialiser)").setRequired(false)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "voir") return executeVoir(interaction);
    if (sub === "carte") return executeCarte(interaction);
    if (sub === "carte-fond") return executeCarteFond(interaction);
  },
};
