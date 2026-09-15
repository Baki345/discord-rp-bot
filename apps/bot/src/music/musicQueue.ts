// In-memory only, per guild — resets on bot restart, same convention as
// every other runtime tracker in this project. Unlike a cooldown map, this
// state is inherently tied to a live voice connection anyway, so there is
// nothing meaningful to persist across a restart.

export type LoopMode = "off" | "track" | "queue";

export interface QueuedTrack {
  encoded: string;
  title: string;
  author: string;
  uri: string | null;
  durationMs: number;
  isStream: boolean;
  requestedByDiscordId: string;
}

export interface GuildMusicState {
  queue: QueuedTrack[];
  current: QueuedTrack | null;
  voiceChannelId: string;
  textChannelId: string;
  volume: number;
  loop: LoopMode;
}

const states = new Map<string, GuildMusicState>();

export function getState(guildId: string): GuildMusicState | undefined {
  return states.get(guildId);
}

export function createState(guildId: string, voiceChannelId: string, textChannelId: string, volume: number): GuildMusicState {
  const state: GuildMusicState = { queue: [], current: null, voiceChannelId, textChannelId, volume, loop: "off" };
  states.set(guildId, state);
  return state;
}

export function deleteState(guildId: string): void {
  states.delete(guildId);
}

export function enqueue(guildId: string, track: QueuedTrack): number {
  const state = states.get(guildId);
  if (!state) throw new Error(`No music state for guild ${guildId}`);
  state.queue.push(track);
  return state.queue.length;
}

/** Advances the queue per the current loop mode and returns the track to play next, or null if there's nothing left. Pure state mutation, no I/O. */
export function advance(guildId: string): QueuedTrack | null {
  const state = states.get(guildId);
  if (!state) return null;

  if (state.loop === "track" && state.current) {
    return state.current;
  }

  if (state.loop === "queue" && state.current) {
    state.queue.push(state.current);
  }

  const next = state.queue.shift() ?? null;
  state.current = next;
  return next;
}

export function clearQueue(guildId: string): void {
  const state = states.get(guildId);
  if (state) state.queue = [];
}

export function setVolume(guildId: string, volume: number): void {
  const state = states.get(guildId);
  if (state) state.volume = volume;
}

export function setLoop(guildId: string, loop: LoopMode): void {
  const state = states.get(guildId);
  if (state) state.loop = loop;
}
