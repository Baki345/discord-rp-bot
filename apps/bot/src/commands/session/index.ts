import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { startSession, endSession, getActiveSession, ServiceError } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

async function executeStart(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  try {
    await startSession(actor, { guildId: actor.guildId });
    await interaction.reply({ content: "🟢 Session RP démarrée." });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "FORBIDDEN" || e.code === "ALREADY_EXISTS")) {
      await interaction.reply({
        content: e.code === "FORBIDDEN" ? "Tu n'as pas la permission de gérer les sessions." : e.message,
        ephemeral: true,
      });
      return;
    }
    throw e;
  }
}

async function executeStop(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  try {
    await endSession(actor, { guildId: actor.guildId });
    await interaction.reply({ content: "🔴 Session RP terminée." });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "FORBIDDEN" || e.code === "NOT_FOUND")) {
      await interaction.reply({
        content: e.code === "FORBIDDEN" ? "Tu n'as pas la permission de gérer les sessions." : e.message,
        ephemeral: true,
      });
      return;
    }
    throw e;
  }
}

async function executeInfo(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const active = await getActiveSession(interaction.guildId!);
  const embed = new EmbedBuilder()
    .setTitle("📅 Session RP")
    .setColor(active ? 0x22c55e : 0x6b7280)
    .setDescription(active ? `🟢 En cours depuis <t:${Math.floor(active.startedAt.getTime() / 1000)}:R>.` : "🔴 Aucune session en cours.");
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

export const sessionCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("session")
    .setDescription("Gérer les sessions RP du serveur")
    .addSubcommand((sub) => sub.setName("start").setDescription("Démarrer une session RP (staff)"))
    .addSubcommand((sub) => sub.setName("stop").setDescription("Terminer la session RP en cours (staff)"))
    .addSubcommand((sub) => sub.setName("info").setDescription("Voir si une session RP est en cours")),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "start") return executeStart(interaction);
    if (sub === "stop") return executeStop(interaction);
    if (sub === "info") return executeInfo(interaction);
  },
};
