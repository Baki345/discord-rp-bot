import { z } from "zod";
import { prisma, type LogCategory } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

export async function listLogRoutes(guildId: string) {
  return prisma.logRoute.findMany({ where: { guildId }, orderBy: { category: "asc" } });
}

export const SetLogRouteInput = z.object({
  guildId: z.string(),
  category: z.enum([
    "GENERAL",
    "MODERATION",
    "APPEALS",
    "AUTOMOD",
    "ANTI_NUKE",
    "VERIFICATION",
    "JOIN_GATE",
    "JOIN_RAID",
    "PANIC",
  ]),
  channelId: z.string().nullable(),
});
export type SetLogRouteInput = z.infer<typeof SetLogRouteInput>;

/** Discord-admin only — like guild.service's setLogChannel, there is no RPRole delegation for where administrative logs go. */
export async function setLogRoute(actor: ActorContext, input: SetLogRouteInput) {
  const data = SetLogRouteInput.parse(input);
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  if (data.channelId === null) {
    await prisma.logRoute.deleteMany({ where: { guildId: data.guildId, category: data.category } });
  } else {
    await prisma.logRoute.upsert({
      where: { guildId_category: { guildId: data.guildId, category: data.category } },
      update: { channelId: data.channelId },
      create: { guildId: data.guildId, category: data.category, channelId: data.channelId },
    });
  }

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "security.set_log_route",
    targetType: "LogRoute",
    metadata: { category: data.category, channelId: data.channelId },
  });
}

/** A category with no LogRoute of its own falls back to GENERAL, per spec ("ce qui n'est pas routé tombe dans le salon principal"). */
export async function resolveLogChannelId(guildId: string, category: LogCategory): Promise<string | null> {
  const route = await prisma.logRoute.findUnique({ where: { guildId_category: { guildId, category } } });
  if (route) return route.channelId;
  if (category === "GENERAL") return null;

  const general = await prisma.logRoute.findUnique({ where: { guildId_category: { guildId, category: "GENERAL" } } });
  return general?.channelId ?? null;
}

const ACTION_PREFIX_CATEGORY: Array<[string, LogCategory]> = [
  ["moderation.", "MODERATION"],
  ["appeal.", "APPEALS"],
  ["automod.", "AUTOMOD"],
  ["antinuke.", "ANTI_NUKE"],
  ["panic.", "PANIC"],
  ["verification.", "VERIFICATION"],
  ["joingate.", "JOIN_GATE"],
  ["joinraid.", "JOIN_RAID"],
];

/** Maps an AuditLog `action` string (e.g. "moderation.ban") to the LogCategory it should be routed under — unmatched actions fall under GENERAL. */
export function categorizeLogAction(action: string): LogCategory {
  for (const [prefix, category] of ACTION_PREFIX_CATEGORY) {
    if (action.startsWith(prefix)) return category;
  }
  return "GENERAL";
}
