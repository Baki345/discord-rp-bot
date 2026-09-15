import { LoadType, type Player, type Track } from "shoukaku";
import { getShoukaku } from "./lavalink.js";
import * as queue from "./musicQueue.js";
import type { LoopMode, QueuedTrack } from "./musicQueue.js";
import type { BotClient } from "../client.js";
import { buildControlsRow, buildNowPlayingEmbed } from "./nowPlaying.js";

export class MusicUnavailableError extends Error {}

// Guards against attaching duplicate 'end'/'exception'/'stuck' listeners if
// joinAndQueue is called again for a guild that already has an active player.
const listenersAttached = new Set<string>();

function toQueuedTrack(track: Track, requestedByDiscordId: string): QueuedTrack {
  return {
    encoded: track.encoded,
    title: track.info.title,
    author: track.info.author,
    uri: track.info.uri ?? null,
    durationMs: track.info.length,
    isStream: track.info.isStream,
    requestedByDiscordId,
  };
}

/**
 * Resolves a search term or direct URL to one or more loadable tracks via
 * Lavalink's own source managers (SoundCloud/Bandcamp/Twitch/Vimeo/HTTP —
 * see docker/lavalink/application.yml). Bare text is searched on
 * SoundCloud (`scsearch:`), the only keyword-searchable source enabled —
 * a direct URL is passed through as-is for whichever source recognizes it.
 */
export async function resolveTracks(query: string): Promise<Track[]> {
  const shoukaku = getShoukaku();
  if (!shoukaku) throw new MusicUnavailableError("La musique n'est pas configurée sur ce bot.");
  const node = shoukaku.getIdealNode();
  if (!node) throw new MusicUnavailableError("Aucun serveur audio disponible pour le moment.");

  const isUrl = /^https?:\/\//i.test(query);
  const result = await node.rest.resolve(isUrl ? query : `scsearch:${query}`);
  if (!result || result.loadType === LoadType.EMPTY) return [];
  if (result.loadType === LoadType.ERROR) throw new Error(result.data.message);
  if (result.loadType === LoadType.TRACK) return [result.data];
  if (result.loadType === LoadType.SEARCH) return result.data.slice(0, 1);
  if (result.loadType === LoadType.PLAYLIST) return result.data.tracks;
  return [];
}

async function joinVoice(client: BotClient, guildId: string, voiceChannelId: string): Promise<Player> {
  const shoukaku = getShoukaku();
  if (!shoukaku) throw new MusicUnavailableError("La musique n'est pas configurée sur ce bot.");
  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error("Serveur introuvable dans le cache du bot.");
  return shoukaku.joinVoiceChannel({ guildId, shardId: guild.shardId ?? 0, channelId: voiceChannelId, deaf: true });
}

function attachPlayerEvents(client: BotClient, guildId: string, player: Player): void {
  if (listenersAttached.has(guildId)) return;
  listenersAttached.add(guildId);

  player.on("end", (event) => {
    if (event.reason === "replaced") return;
    playNext(client, guildId).catch((e: unknown) => console.error(`[musique] Échec du passage à la piste suivante (${guildId}) :`, e));
  });
  player.on("exception", (event) => {
    console.error(`[musique] Erreur de lecture (${guildId}) :`, event.exception.message);
  });
  player.on("stuck", (event) => {
    console.warn(`[musique] Piste bloquée (${guildId}), passage à la suivante après ${event.thresholdMs}ms.`);
  });
}

async function announceNowPlaying(client: BotClient, guildId: string, textChannelId: string, track: QueuedTrack): Promise<void> {
  try {
    const channel = await client.channels.fetch(textChannelId);
    if (!channel?.isSendable()) return;
    const requester = await client.users.fetch(track.requestedByDiscordId).catch(() => null);
    const state = queue.getState(guildId);
    const embed = buildNowPlayingEmbed(track, state?.queue.length ?? 0, state?.loop ?? "off", requester?.tag ?? track.requestedByDiscordId);
    await channel.send({ embeds: [embed], components: [buildControlsRow(false)] });
  } catch (e) {
    console.error(`[musique] Impossible d'annoncer la piste en cours (${guildId}) :`, e);
  }
}

/**
 * Plays the next queued track (respecting loop mode) and announces it in
 * the session's text channel, or leaves the channel and cleans up if the
 * queue is empty. The single place a "now playing" message gets posted —
 * both the initial /musique jouer and every later auto-advance go through
 * here, so there's exactly one source of that message, never a duplicate.
 */
export async function playNext(client: BotClient, guildId: string): Promise<QueuedTrack | null> {
  const shoukaku = getShoukaku();
  const player = shoukaku?.players.get(guildId);
  const state = queue.getState(guildId);
  const next = queue.advance(guildId);

  if (!player || !next || !state) {
    await leaveVoice(guildId);
    return null;
  }

  await player.playTrack({ track: { encoded: next.encoded } });
  await announceNowPlaying(client, guildId, state.textChannelId, next);
  return next;
}

export async function leaveVoice(guildId: string): Promise<void> {
  const shoukaku = getShoukaku();
  await shoukaku?.leaveVoiceChannel(guildId);
  queue.deleteState(guildId);
  listenersAttached.delete(guildId);
}

/**
 * Joins (if not already connected) and enqueues one or more tracks,
 * starting playback immediately if nothing else is playing. Reuses the
 * existing session's voice channel if the bot is already active in this
 * guild — one music session per guild, first request picks the channel.
 */
export async function joinAndQueue(
  client: BotClient,
  guildId: string,
  voiceChannelId: string,
  textChannelId: string,
  tracks: Track[],
  requestedByDiscordId: string,
  defaultVolume: number,
): Promise<{ started: boolean; queuedTracks: QueuedTrack[] }> {
  let state = queue.getState(guildId);
  let player: Player;

  if (!state) {
    player = await joinVoice(client, guildId, voiceChannelId);
    state = queue.createState(guildId, voiceChannelId, textChannelId, defaultVolume);
    await player.setGlobalVolume(defaultVolume);
    attachPlayerEvents(client, guildId, player);
  } else {
    const shoukaku = getShoukaku();
    const existing = shoukaku?.players.get(guildId);
    if (!existing) throw new Error("État musical incohérent : session enregistrée mais lecteur introuvable.");
    player = existing;
  }

  const queuedTracks = tracks.map((t) => toQueuedTrack(t, requestedByDiscordId));
  for (const t of queuedTracks) queue.enqueue(guildId, t);

  let started = false;
  if (!state.current) {
    const next = await playNext(client, guildId);
    started = next !== null;
  }

  return { started, queuedTracks };
}

export async function skip(guildId: string): Promise<boolean> {
  const shoukaku = getShoukaku();
  const player = shoukaku?.players.get(guildId);
  if (!player) return false;
  await player.stopTrack();
  return true;
}

export async function stop(guildId: string): Promise<boolean> {
  const shoukaku = getShoukaku();
  const player = shoukaku?.players.get(guildId);
  if (!player) return false;
  queue.clearQueue(guildId);
  queue.setLoop(guildId, "off");
  await player.stopTrack();
  return true;
}

/** Returns the new paused state, or null if there's no active session. */
export async function togglePause(guildId: string): Promise<boolean | null> {
  const shoukaku = getShoukaku();
  const player = shoukaku?.players.get(guildId);
  if (!player) return null;
  const paused = !player.paused;
  await player.setPaused(paused);
  return paused;
}

/** Returns false if there's no active session (nothing to pause/resume). */
export async function setPaused(guildId: string, paused: boolean): Promise<boolean> {
  const shoukaku = getShoukaku();
  const player = shoukaku?.players.get(guildId);
  if (!player) return false;
  await player.setPaused(paused);
  return true;
}

export async function changeVolume(guildId: string, volume: number): Promise<boolean> {
  const shoukaku = getShoukaku();
  const player = shoukaku?.players.get(guildId);
  if (!player) return false;
  queue.setVolume(guildId, volume);
  await player.setGlobalVolume(volume);
  return true;
}

export function cycleLoop(guildId: string): LoopMode | null {
  const state = queue.getState(guildId);
  if (!state) return null;
  const order: LoopMode[] = ["off", "track", "queue"];
  const next = order[(order.indexOf(state.loop) + 1) % order.length]!;
  queue.setLoop(guildId, next);
  return next;
}
