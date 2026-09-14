import { EmbedBuilder, TextChannel } from "discord.js";
import { prisma, type Prisma } from "@discord-rp/database";
import { categorizeLogAction, resolveLogChannelId } from "@discord-rp/core";
import type { BotClient } from "../client.js";

type AuditLogWithActor = Prisma.AuditLogGetPayload<{ include: { actorCharacter: true } }>;

const POLL_INTERVAL_MS = 10_000;
const BATCH_SIZE = 50;

const ACTOR_LABELS: Record<string, string> = {
  DISCORD_USER: "Discord",
  DASHBOARD_USER: "Dashboard",
  SYSTEM: "Système",
};

/**
 * Mirrors AuditLog rows to each guild's configured log channel, routed per
 * category (categorizeLogAction maps the action string, e.g. "moderation.ban",
 * to a LogCategory; resolveLogChannelId then falls back to GENERAL). Runs as
 * a poll (not an in-process event) because the audit log is written from two
 * separate processes (this bot AND the dashboard's Next.js server) — only
 * this process holds a live Discord connection, so it is the only one that
 * can reliably deliver both origins' entries.
 */
export function startAuditLogMirror(client: BotClient) {
  const tick = async () => {
    try {
      await mirrorPendingAuditLogs(client);
    } catch (err) {
      console.error("[audit-mirror] tick failed:", err);
    }
  };
  void tick();
  setInterval(tick, POLL_INTERVAL_MS);
}

async function mirrorPendingAuditLogs(client: BotClient) {
  const pending = await prisma.auditLog.findMany({
    where: { mirroredToDiscord: false },
    include: { actorCharacter: true },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });
  if (pending.length === 0) return;

  for (const entry of pending) {
    const category = categorizeLogAction(entry.action);
    const channelId = await resolveLogChannelId(entry.guildId, category);
    if (channelId) {
      await mirrorOne(client, channelId, entry);
    } else {
      await prisma.auditLog.update({ where: { id: entry.id }, data: { mirroredToDiscord: true } });
    }
  }
}

async function mirrorOne(client: BotClient, channelId: string, entry: AuditLogWithActor) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel instanceof TextChannel) {
      const actorLabel = entry.actorCharacter
        ? `${entry.actorCharacter.firstName} ${entry.actorCharacter.lastName}`
        : (ACTOR_LABELS[entry.actorType] ?? entry.actorType);

      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(entry.action)
        .setDescription(
          [
            `**Acteur :** ${actorLabel}${entry.actorDiscordId ? ` (<@${entry.actorDiscordId}>)` : ""}`,
            entry.targetType ? `**Cible :** ${entry.targetType}${entry.targetId ? ` #${entry.targetId.slice(0, 8)}` : ""}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        )
        .setTimestamp(entry.createdAt);
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    // Channel deleted, missing permissions, etc. — log and still mark it
    // mirrored below so a permanently-broken channel doesn't retry forever.
    console.error(`[audit-mirror] failed to deliver log ${entry.id} to channel ${channelId}:`, err);
  }

  await prisma.auditLog.update({ where: { id: entry.id }, data: { mirroredToDiscord: true } });
}
