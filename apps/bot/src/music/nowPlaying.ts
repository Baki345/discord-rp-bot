import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { LoopMode, QueuedTrack } from "./musicQueue.js";

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "🔴 En direct";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const LOOP_LABELS: Record<LoopMode, string> = { off: "Désactivée", track: "Piste", queue: "File" };

export function buildNowPlayingEmbed(track: QueuedTrack, queueLength: number, loop: LoopMode, requestedByTag: string) {
  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle("🎵 En cours de lecture")
    .setDescription(track.uri ? `**[${track.title}](${track.uri})**\n${track.author}` : `**${track.title}**\n${track.author}`)
    .addFields(
      { name: "Durée", value: track.isStream ? "🔴 En direct" : formatDuration(track.durationMs), inline: true },
      { name: "File d'attente", value: `${queueLength} piste(s)`, inline: true },
      { name: "Boucle", value: LOOP_LABELS[loop], inline: true },
    )
    .setFooter({ text: `Demandé par ${requestedByTag}` });
  return embed;
}

export function buildControlsRow(paused: boolean) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("musique:pause")
      .setEmoji(paused ? "▶️" : "⏸️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("musique:skip").setEmoji("⏭️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("musique:stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("musique:loop").setEmoji("🔁").setStyle(ButtonStyle.Secondary),
  );
}
