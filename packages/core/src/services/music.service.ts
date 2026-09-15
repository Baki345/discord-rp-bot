import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";

export const MusicConfig = z.object({
  enabled: z.boolean().default(false),
  /** Null = any member can pause/skip/stop/change volume; set = only that role (or a Discord admin). Queueing itself is never DJ-gated. */
  djRoleId: z.string().nullable().default(null),
  /** Empty = any voice channel is allowed. */
  allowedVoiceChannelIds: z.array(z.string()).default([]),
  /** Empty = any text channel can run music commands. */
  allowedTextChannelIds: z.array(z.string()).default([]),
  defaultVolume: z.number().int().min(0).max(150).default(100),
  maxQueueSize: z.number().int().min(1).max(500).default(100),
});
export type MusicConfig = z.infer<typeof MusicConfig>;

export async function getMusicConfig(guildId: string): Promise<MusicConfig> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  return MusicConfig.parse(config?.musicConfig ?? {});
}

export async function setMusicConfig(actor: ActorContext, guildId: string, input: Partial<z.input<typeof MusicConfig>>) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const current = await getMusicConfig(guildId);
  const merged = MusicConfig.parse({ ...current, ...input });

  return prisma.guildConfig.update({ where: { guildId }, data: { musicConfig: merged as never } });
}

/** Pure — no I/O. A Discord admin always passes, same convention as command-permission.service.ts. */
export function canControlMusic(config: MusicConfig, actorRoleIds: string[], isDiscordGuildAdmin: boolean): boolean {
  if (isDiscordGuildAdmin) return true;
  if (!config.djRoleId) return true;
  return actorRoleIds.includes(config.djRoleId);
}

/** Pure — no I/O. Empty allow-list means unrestricted. */
export function isChannelAllowed(allowedChannelIds: string[], channelId: string): boolean {
  return allowedChannelIds.length === 0 || allowedChannelIds.includes(channelId);
}
