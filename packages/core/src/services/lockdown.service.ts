import { z } from "zod";
import { prisma, type Prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

const ChannelOverwriteSnapshot = z.object({
  view: z.boolean().nullable().optional(),
  send: z.boolean().nullable().optional(),
  connect: z.boolean().nullable().optional(),
});

export const LockdownState = z.object({
  active: z.boolean().default(false),
  hidden: z.boolean().default(false),
  fullServer: z.boolean().default(false),
  lockedChannelIds: z.array(z.string()).default([]),
  channelPriorOverwrites: z.record(z.string(), ChannelOverwriteSnapshot).default({}),
  autoKickNewMembers: z.boolean().default(false),
  autoBanNewMembers: z.boolean().default(false),
  invitesPaused: z.boolean().default(false),
  strippedRolePermissions: z.record(z.string(), z.string()).default({}),
  lockedAt: z.string().nullable().default(null),
  lockedByDiscordId: z.string().nullable().default(null),
});
export type LockdownState = z.infer<typeof LockdownState>;

export async function getLockdownState(guildId: string): Promise<LockdownState> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  const parsed = LockdownState.safeParse(config?.lockdownState ?? {});
  return parsed.success ? parsed.data : LockdownState.parse({});
}

/** apps/bot captures the live Discord state (channel overwrites, role permissions) BEFORE calling this — packages/core only persists what it's handed. */
export async function startLockdown(
  actor: ActorContext,
  input: {
    guildId: string;
    hidden: boolean;
    fullServer: boolean;
    lockedChannelIds: string[];
    channelPriorOverwrites: LockdownState["channelPriorOverwrites"];
    autoKickNewMembers: boolean;
    autoBanNewMembers: boolean;
    invitesPaused: boolean;
    strippedRolePermissions: LockdownState["strippedRolePermissions"];
  },
) {
  const current = await getLockdownState(input.guildId);
  if (current.active) throw new ServiceError("ALREADY_EXISTS", {}, "Un lockdown est déjà actif — utilise /lockdown fin d'abord.");

  const next = LockdownState.parse({
    active: true,
    hidden: input.hidden,
    fullServer: input.fullServer,
    lockedChannelIds: input.lockedChannelIds,
    channelPriorOverwrites: input.channelPriorOverwrites,
    autoKickNewMembers: input.autoKickNewMembers,
    autoBanNewMembers: input.autoBanNewMembers,
    invitesPaused: input.invitesPaused,
    strippedRolePermissions: input.strippedRolePermissions,
    lockedAt: new Date().toISOString(),
    lockedByDiscordId: actor.discordUserId,
  });

  await prisma.guildConfig.update({ where: { guildId: input.guildId }, data: { lockdownState: next as Prisma.InputJsonValue } });

  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "lockdown.start",
    targetType: "GuildConfig",
    metadata: { hidden: input.hidden, fullServer: input.fullServer, channelCount: input.lockedChannelIds.length },
  });

  return next;
}

/** Returns the state that was active (with all restoration data) so the bot can undo every change it made. */
export async function endLockdown(actor: ActorContext, guildId: string): Promise<LockdownState> {
  const current = await getLockdownState(guildId);
  if (!current.active) throw new ServiceError("NOT_FOUND", {}, "Aucun lockdown actif.");

  await prisma.guildConfig.update({ where: { guildId }, data: { lockdownState: LockdownState.parse({}) as Prisma.InputJsonValue } });

  await writeAuditLog({
    guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "lockdown.end",
    targetType: "GuildConfig",
  });

  return current;
}
