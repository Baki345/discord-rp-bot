import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getMusicConfig, isChannelAllowed } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import type { BotClient } from "../../client.js";
import * as playback from "../../music/playback.js";
import * as queue from "../../music/musicQueue.js";
import { actorCanControlMusic } from "../../music/musicPermissions.js";
import { MusicUnavailableError } from "../../music/playback.js";

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "🔴 direct";
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
}

async function checkPreconditions(interaction: ChatInputCommandInteraction): Promise<Awaited<ReturnType<typeof getMusicConfig>> | null> {
  const config = await getMusicConfig(interaction.guildId!);
  if (!config.enabled) {
    await interaction.editReply("❌ La musique n'est pas activée sur ce serveur.");
    return null;
  }
  if (!isChannelAllowed(config.allowedTextChannelIds, interaction.channelId)) {
    await interaction.editReply("❌ Les commandes musique ne sont pas autorisées dans ce salon.");
    return null;
  }
  return config;
}

async function executeJouer(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const config = await checkPreconditions(interaction);
  if (!config) return;

  const member = interaction.member;
  const voiceChannelId = member && "voice" in member ? member.voice.channelId : null;
  if (!voiceChannelId) {
    await interaction.editReply("❌ Rejoins un salon vocal d'abord.");
    return;
  }
  if (!isChannelAllowed(config.allowedVoiceChannelIds, voiceChannelId)) {
    await interaction.editReply("❌ La musique n'est pas autorisée dans ce salon vocal.");
    return;
  }

  const existing = queue.getState(interaction.guildId!);
  if (existing && existing.voiceChannelId !== voiceChannelId) {
    await interaction.editReply("❌ Le bot joue déjà de la musique dans un autre salon vocal de ce serveur.");
    return;
  }
  if (existing && existing.queue.length >= config.maxQueueSize) {
    await interaction.editReply(`❌ La file d'attente est pleine (max ${config.maxQueueSize} pistes).`);
    return;
  }

  const requete = interaction.options.getString("requete", true);
  let tracks;
  try {
    tracks = await playback.resolveTracks(requete);
  } catch (e) {
    await interaction.editReply(`❌ ${e instanceof MusicUnavailableError ? e.message : "Impossible de charger cette piste."}`);
    return;
  }
  if (tracks.length === 0) {
    await interaction.editReply("❌ Aucun résultat trouvé.");
    return;
  }

  const { started, queuedTracks } = await playback.joinAndQueue(
    interaction.client as BotClient,
    interaction.guildId!,
    voiceChannelId,
    interaction.channelId,
    tracks,
    interaction.user.id,
    config.defaultVolume,
  );

  if (started) {
    await interaction.editReply(`▶️ Lecture démarrée — ${queuedTracks.length > 1 ? `${queuedTracks.length} pistes ajoutées.` : queuedTracks[0]!.title}`);
  } else {
    await interaction.editReply(
      queuedTracks.length > 1
        ? `✅ ${queuedTracks.length} pistes ajoutées à la file d'attente.`
        : `✅ **${queuedTracks[0]!.title}** ajoutée à la file d'attente.`,
    );
  }
}

async function executePauseOrReprendre(interaction: ChatInputCommandInteraction, paused: boolean) {
  await interaction.deferReply({ ephemeral: true });
  const config = await checkPreconditions(interaction);
  if (!config) return;
  if (!actorCanControlMusic(interaction, config)) {
    await interaction.editReply("❌ Il te faut le rôle DJ (ou administrateur) pour contrôler la musique.");
    return;
  }
  const ok = await playback.setPaused(interaction.guildId!, paused);
  await interaction.editReply(ok ? (paused ? "⏸️ Musique en pause." : "▶️ Lecture reprise.") : "❌ Rien n'est en cours de lecture.");
}

async function executePasser(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const config = await checkPreconditions(interaction);
  if (!config) return;
  if (!actorCanControlMusic(interaction, config)) {
    await interaction.editReply("❌ Il te faut le rôle DJ (ou administrateur) pour contrôler la musique.");
    return;
  }
  const ok = await playback.skip(interaction.guildId!);
  await interaction.editReply(ok ? "⏭️ Piste passée." : "❌ Rien n'est en cours de lecture.");
}

async function executeStop(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const config = await checkPreconditions(interaction);
  if (!config) return;
  if (!actorCanControlMusic(interaction, config)) {
    await interaction.editReply("❌ Il te faut le rôle DJ (ou administrateur) pour contrôler la musique.");
    return;
  }
  const ok = await playback.stop(interaction.guildId!);
  await interaction.editReply(ok ? "⏹️ Musique arrêtée, file vidée." : "❌ Rien n'est en cours de lecture.");
}

async function executeFile(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const config = await checkPreconditions(interaction);
  if (!config) return;

  const state = queue.getState(interaction.guildId!);
  if (!state || !state.current) {
    await interaction.editReply("ℹ️ Rien n'est en cours de lecture.");
    return;
  }

  const lines = [`🎵 **En cours :** ${state.current.title} (${formatDuration(state.current.durationMs)})`];
  if (state.queue.length > 0) {
    lines.push("", "**À suivre :**");
    for (const [i, track] of state.queue.slice(0, 10).entries()) {
      lines.push(`${i + 1}. ${track.title} (${formatDuration(track.durationMs)})`);
    }
    if (state.queue.length > 10) lines.push(`… et ${state.queue.length - 10} de plus.`);
  }
  await interaction.editReply(lines.join("\n"));
}

async function executeVolume(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const config = await checkPreconditions(interaction);
  if (!config) return;
  if (!actorCanControlMusic(interaction, config)) {
    await interaction.editReply("❌ Il te faut le rôle DJ (ou administrateur) pour contrôler la musique.");
    return;
  }
  const volume = interaction.options.getInteger("valeur", true);
  const ok = await playback.changeVolume(interaction.guildId!, volume);
  await interaction.editReply(ok ? `🔊 Volume réglé à ${volume}%.` : "❌ Rien n'est en cours de lecture.");
}

export const musiqueCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("musique")
    .setDescription("Écouter de la musique en vocal")
    .addSubcommand((sub) =>
      sub
        .setName("jouer")
        .setDescription("Jouer ou mettre en file une piste (lien direct, SoundCloud, Bandcamp, Twitch, Vimeo)")
        .addStringOption((opt) => opt.setName("requete").setDescription("Lien ou recherche").setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName("pause").setDescription("Mettre la lecture en pause"))
    .addSubcommand((sub) => sub.setName("reprendre").setDescription("Reprendre la lecture"))
    .addSubcommand((sub) => sub.setName("passer").setDescription("Passer à la piste suivante"))
    .addSubcommand((sub) => sub.setName("stop").setDescription("Arrêter la musique et vider la file"))
    .addSubcommand((sub) => sub.setName("file").setDescription("Voir la file d'attente"))
    .addSubcommand((sub) =>
      sub
        .setName("volume")
        .setDescription("Régler le volume")
        .addIntegerOption((opt) => opt.setName("valeur").setDescription("0 à 150").setRequired(true).setMinValue(0).setMaxValue(150)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "jouer") return executeJouer(interaction);
    if (sub === "pause") return executePauseOrReprendre(interaction, true);
    if (sub === "reprendre") return executePauseOrReprendre(interaction, false);
    if (sub === "passer") return executePasser(interaction);
    if (sub === "stop") return executeStop(interaction);
    if (sub === "file") return executeFile(interaction);
    if (sub === "volume") return executeVolume(interaction);
  },
};
