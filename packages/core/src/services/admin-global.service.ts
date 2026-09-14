import { z } from "zod";
import { prisma } from "@discord-rp/database";
import { getSuperAdminDiscordIds, loadEnv } from "@discord-rp/config";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

/**
 * Bot-operator-level access (SUPER_ADMIN_DISCORD_IDS), not a guild permission.
 * Every other service guards with ActorContext, which is scoped to one
 * guildId — this panel spans every guild the bot is installed in, so there
 * is no single guild to scope an ActorContext to. The guard is therefore a
 * flat Discord-ID allowlist checked directly, the same exception class as
 * anti-nuke's bypassImmunity: a deliberate, narrow escape from the normal
 * per-guild model for the one actor who operates the bot itself.
 */
export function requireSuperAdmin(actorDiscordId: string): void {
  const ids = getSuperAdminDiscordIds(loadEnv());
  if (!ids.includes(actorDiscordId)) throw new ServiceError("FORBIDDEN");
}

export async function listGuildsOverview(actorDiscordId: string) {
  requireSuperAdmin(actorDiscordId);

  const guilds = await prisma.guild.findMany({
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  const guildIds = guilds.map((g) => g.id);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [characterCounts, moderationCounts] = await Promise.all([
    prisma.character.groupBy({ by: ["guildId"], where: { guildId: { in: guildIds } }, _count: { _all: true } }),
    prisma.moderationCase.groupBy({
      by: ["guildId"],
      where: { guildId: { in: guildIds }, createdAt: { gte: since24h } },
      _count: { _all: true },
    }),
  ]);
  const characterCountByGuild = new Map(characterCounts.map((c) => [c.guildId, c._count._all]));
  const moderationCountByGuild = new Map(moderationCounts.map((c) => [c.guildId, c._count._all]));

  return guilds.map((g) => ({
    id: g.id,
    name: g.name,
    iconUrl: g.iconUrl,
    ownerDiscordId: g.ownerDiscordId,
    planId: g.planId,
    planName: g.plan.name,
    isBlacklisted: g.isBlacklisted,
    createdAt: g.createdAt,
    characterCount: characterCountByGuild.get(g.id) ?? 0,
    moderationCases24h: moderationCountByGuild.get(g.id) ?? 0,
  }));
}

export async function getGlobalStats(actorDiscordId: string) {
  requireSuperAdmin(actorDiscordId);

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totalGuilds, blacklistedGuilds, totalUsers, totalCharacters, moderationCases24h, activeQuarantines] = await Promise.all([
    prisma.guild.count(),
    prisma.guild.count({ where: { isBlacklisted: true } }),
    prisma.user.count(),
    prisma.character.count(),
    prisma.moderationCase.count({ where: { createdAt: { gte: since24h } } }),
    prisma.quarantineRecord.count({ where: { releasedAt: null } }),
  ]);

  return { totalGuilds, blacklistedGuilds, totalUsers, totalCharacters, moderationCases24h, activeQuarantines };
}

export const SetGuildBlacklistedInput = z.object({
  guildId: z.string(),
  isBlacklisted: z.boolean(),
});
export type SetGuildBlacklistedInput = z.infer<typeof SetGuildBlacklistedInput>;

/**
 * A blacklisted guild's bot commands are refused at the single choke point
 * in apps/bot/src/events/interactionCreate.ts — the bot stays joined (no
 * automatic leave, which would be a harder-to-reverse action than a flag
 * a super admin can flip back).
 */
export async function setGuildBlacklisted(actorDiscordId: string, input: SetGuildBlacklistedInput) {
  requireSuperAdmin(actorDiscordId);
  const data = SetGuildBlacklistedInput.parse(input);

  const updated = await prisma.guild.update({
    where: { id: data.guildId },
    data: { isBlacklisted: data.isBlacklisted },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: "DASHBOARD_USER",
    actorDiscordId,
    action: data.isBlacklisted ? "admin.blacklist_guild" : "admin.unblacklist_guild",
    targetType: "Guild",
    targetId: data.guildId,
  });

  return updated;
}

export const SetGuildPlanInput = z.object({
  guildId: z.string(),
  planId: z.string(),
});
export type SetGuildPlanInput = z.infer<typeof SetGuildPlanInput>;

/**
 * A direct plan assignment, not a billing event — GuildSubscription (real
 * payment-provider tracking) is untouched. This is only the operator
 * manually granting or revoking premium, independent of whether a payment
 * ever happened.
 */
export async function setGuildPlan(actorDiscordId: string, input: SetGuildPlanInput) {
  requireSuperAdmin(actorDiscordId);
  const data = SetGuildPlanInput.parse(input);

  const plan = await prisma.premiumPlan.findUnique({ where: { id: data.planId } });
  if (!plan) throw new ServiceError("NOT_FOUND", { planId: data.planId }, "Ce plan n'existe pas.");

  const updated = await prisma.guild.update({
    where: { id: data.guildId },
    data: { planId: data.planId },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: "DASHBOARD_USER",
    actorDiscordId,
    action: "admin.set_guild_plan",
    targetType: "Guild",
    targetId: data.guildId,
    metadata: { planId: data.planId },
  });

  return updated;
}

/** Cross-guild activity feed for the admin panel — reads the same AuditLog every mutating service call already writes to, no new logging system. */
export async function listRecentAuditActivity(actorDiscordId: string, limit = 20) {
  requireSuperAdmin(actorDiscordId);

  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { guild: { select: { name: true } } },
  });
}
