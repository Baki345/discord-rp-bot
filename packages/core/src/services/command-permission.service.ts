import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export interface CommandPermissionCheckResult {
  allowed: boolean;
  reason?: "denied_role" | "not_allowed_role" | "wrong_channel" | "cooldown";
  retryAfterSeconds?: number;
}

/**
 * Pure — no I/O, no clock read. `lastInvokedAt` is supplied by the bot's
 * own in-memory per-guild-per-command-per-user tracker (cooldown state is
 * deliberately ephemeral, same as every other cooldown in this project —
 * ticket auto-close, leveling's text-XP cooldown, etc. — not persisted).
 * A Discord admin always passes: they're the one who set these rules and
 * shouldn't be able to lock themselves out of their own server.
 */
export function evaluateCommandPermission(
  override: {
    allowedRoleIds: unknown;
    deniedRoleIds: unknown;
    allowedChannelIds: unknown;
    cooldownSeconds: number | null;
  } | null,
  input: {
    actorRoleIds: string[];
    channelId: string;
    isDiscordGuildAdmin: boolean;
    lastInvokedAt: Date | null;
    now: Date;
  },
): CommandPermissionCheckResult {
  if (input.isDiscordGuildAdmin) return { allowed: true };
  if (!override) return { allowed: true };

  const deniedRoleIds = asStringArray(override.deniedRoleIds);
  if (deniedRoleIds.some((id) => input.actorRoleIds.includes(id))) {
    return { allowed: false, reason: "denied_role" };
  }

  const allowedRoleIds = asStringArray(override.allowedRoleIds);
  if (allowedRoleIds.length > 0 && !allowedRoleIds.some((id) => input.actorRoleIds.includes(id))) {
    return { allowed: false, reason: "not_allowed_role" };
  }

  const allowedChannelIds = asStringArray(override.allowedChannelIds);
  if (allowedChannelIds.length > 0 && !allowedChannelIds.includes(input.channelId)) {
    return { allowed: false, reason: "wrong_channel" };
  }

  if (override.cooldownSeconds && input.lastInvokedAt) {
    const elapsedMs = input.now.getTime() - input.lastInvokedAt.getTime();
    const remainingMs = override.cooldownSeconds * 1000 - elapsedMs;
    if (remainingMs > 0) {
      return { allowed: false, reason: "cooldown", retryAfterSeconds: Math.ceil(remainingMs / 1000) };
    }
  }

  return { allowed: true };
}

export async function getCommandPermissionOverride(guildId: string, commandName: string) {
  return prisma.commandPermissionOverride.findUnique({ where: { guildId_commandName: { guildId, commandName } } });
}

export async function listCommandPermissionOverrides(guildId: string) {
  return prisma.commandPermissionOverride.findMany({ where: { guildId }, orderBy: { commandName: "asc" } });
}

export const UpsertCommandPermissionOverrideInput = z.object({
  guildId: z.string(),
  commandName: z.string().min(1).max(32),
  allowedRoleIds: z.array(z.string()).default([]),
  deniedRoleIds: z.array(z.string()).default([]),
  allowedChannelIds: z.array(z.string()).default([]),
  cooldownSeconds: z.number().int().min(1).nullable().default(null),
});
export type UpsertCommandPermissionOverrideInput = z.input<typeof UpsertCommandPermissionOverrideInput>;

export async function upsertCommandPermissionOverride(actor: ActorContext, input: UpsertCommandPermissionOverrideInput) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const data = UpsertCommandPermissionOverrideInput.parse(input);

  const override = await prisma.commandPermissionOverride.upsert({
    where: { guildId_commandName: { guildId: data.guildId, commandName: data.commandName } },
    update: data,
    create: data,
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "command_permission.upsert",
    targetType: "CommandPermissionOverride",
    targetId: override.id,
    metadata: { commandName: data.commandName },
  });

  return override;
}

export async function deleteCommandPermissionOverride(actor: ActorContext, guildId: string, commandName: string) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  await prisma.commandPermissionOverride.delete({ where: { guildId_commandName: { guildId, commandName } } });

  await writeAuditLog({
    guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "command_permission.delete",
    targetType: "CommandPermissionOverride",
    metadata: { commandName },
  });
}
