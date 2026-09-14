import { z } from "zod";
import { prisma } from "@discord-rp/database";
import { PLAN_IDS, DEFAULT_STARTING_CASH_CENTS } from "@discord-rp/config";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

export const EnsureGuildInput = z.object({
  guildId: z.string(),
  name: z.string(),
  ownerDiscordId: z.string(),
  iconUrl: z.string().optional(),
});
export type EnsureGuildInput = z.infer<typeof EnsureGuildInput>;

/**
 * Idempotent: called both from the bot's guildCreate event (automatic, on
 * install) and from /config setup (explicit, in case guildCreate was
 * missed — e.g. the bot was added while offline). Never overwrites an
 * existing GuildConfig's settings, only creates what's missing.
 */
export async function ensureGuild(input: EnsureGuildInput) {
  const data = EnsureGuildInput.parse(input);
  const wasNew = (await prisma.guild.findUnique({ where: { id: data.guildId } })) === null;

  const guild = await prisma.guild.upsert({
    where: { id: data.guildId },
    update: { name: data.name, iconUrl: data.iconUrl },
    create: {
      id: data.guildId,
      name: data.name,
      ownerDiscordId: data.ownerDiscordId,
      iconUrl: data.iconUrl,
      planId: PLAN_IDS.FREE,
    },
  });

  const config = await prisma.guildConfig.upsert({
    where: { guildId: data.guildId },
    update: {},
    create: {
      guildId: data.guildId,
      startingCashCents: DEFAULT_STARTING_CASH_CENTS,
    },
  });

  if (wasNew) {
    await writeAuditLog({
      guildId: data.guildId,
      actorType: "SYSTEM",
      action: "guild.setup",
      targetType: "Guild",
      targetId: data.guildId,
      metadata: { name: data.name },
    });
  }

  return { guild, config };
}

export async function getGuildConfig(guildId: string) {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (!config) throw new ServiceError("NOT_FOUND", { guildId }, "Ce serveur n'est pas encore configuré.");
  return config;
}

export const UpdateGuildConfigInput = z.object({
  guildId: z.string(),
  startingCashCents: z.number().int().min(0).optional(),
  maxCharactersOverride: z.number().int().min(1).nullable().optional(),
  hungerThirstEnabled: z.boolean().optional(),
});
export type UpdateGuildConfigInput = z.infer<typeof UpdateGuildConfigInput>;

/** Guild-wide settings — like log channels, Discord-admin-only (no RPRole delegation): these affect every player on the server. */
export async function updateGuildConfig(actor: ActorContext, input: UpdateGuildConfigInput) {
  const data = UpdateGuildConfigInput.parse(input);
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const updated = await prisma.guildConfig.update({
    where: { guildId: data.guildId },
    data: {
      startingCashCents: data.startingCashCents,
      maxCharactersOverride: data.maxCharactersOverride,
      hungerThirstEnabled: data.hungerThirstEnabled,
    },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "guild.update_config",
    targetType: "GuildConfig",
    metadata: { ...data, guildId: undefined },
  });

  return updated;
}

export const SetLogChannelInput = z.object({
  guildId: z.string(),
  channel: z.enum(["audit", "economy", "moderation"]),
  channelId: z.string().nullable(),
});

/**
 * Only a Discord guild admin can point log channels — there is no RPRole
 * delegation for this, it configures where administrative logs go.
 */
export async function setLogChannel(actor: ActorContext, input: z.infer<typeof SetLogChannelInput>) {
  const data = SetLogChannelInput.parse(input);
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const update =
    data.channel === "audit"
      ? { auditLogChannelId: data.channelId }
      : data.channel === "economy"
        ? { economyLogChannelId: data.channelId }
        : { moderationLogChannelId: data.channelId };

  const updated = await prisma.guildConfig.update({
    where: { guildId: data.guildId },
    data: update,
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "guild.set_log_channel",
    targetType: "GuildConfig",
    metadata: { channel: data.channel, channelId: data.channelId },
  });

  return updated;
}
