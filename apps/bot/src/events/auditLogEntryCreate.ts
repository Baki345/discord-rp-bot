import { AuditLogEvent, Events, type Guild, type GuildAuditLogsEntry } from "discord.js";
import {
  getAntiNukeConfig,
  isActorWhitelisted,
  isCategoryWhitelisted,
  isTrackedDestructiveAction,
  checkThresholdBreach,
  recordAntiNukeIncident,
  getQuarantineRoleId,
  getActiveQuarantine,
  startQuarantine,
  getPanicConfig,
  getPanicState,
  checkPanicTrigger,
  type ActorContext,
} from "@discord-rp/core";
import type { BotClient } from "../client.js";
import { recordAction, clearActor } from "../security/antiNukeTracker.js";
import { recordBreach, getRecentBreaches, clearBreaches } from "../security/panicTracker.js";
import { activatePanic } from "../security/panicActions.js";

/** Requires no privileged intent — GuildAuditLogEntryCreate is a non-privileged gateway event, added specifically to make real-time audit-log-driven detection like this possible without polling. */
export function registerAuditLogEntryCreateEvent(client: BotClient) {
  client.on(Events.GuildAuditLogEntryCreate, async (entry: GuildAuditLogsEntry, guild: Guild) => {
    try {
      await handleEntry(entry, guild, client);
    } catch (err) {
      console.error("[anti-nuke] failed to process audit log entry:", err);
    }
  });
}

function systemActor(guildId: string): ActorContext {
  return { guildId, discordUserId: "SYSTEM", source: "discord-bot", isDiscordGuildAdmin: true, rpPermissions: [] };
}

async function quarantineActor(guild: Guild, actorId: string, kind: string): Promise<boolean> {
  const roleId = await getQuarantineRoleId(guild.id);
  if (!roleId) return false;

  const member = await guild.members.fetch(actorId).catch(() => null);
  if (!member) return false;

  try {
    const priorRoleIds = member.roles.cache.filter((r) => r.id !== guild.id).map((r) => r.id);
    await startQuarantine(systemActor(guild.id), {
      guildId: guild.id,
      discordUserId: actorId,
      priorRoleIds,
      reason: `Anti-nuke : ${kind}`,
      bypassImmunity: true,
    });
    await member.roles.set([roleId], `Anti-nuke : ${kind}`);
    return true;
  } catch (err) {
    console.error(`[anti-nuke] failed to auto-quarantine ${actorId}:`, err);
    return false;
  }
}

async function respond(guild: Guild, actorId: string, autoQuarantineOnBreach: boolean, kind: string, details: Record<string, unknown>) {
  const autoQuarantined = autoQuarantineOnBreach ? await quarantineActor(guild, actorId, kind) : false;
  await recordAntiNukeIncident({ guildId: guild.id, actorId, kind, details, autoQuarantined });
}

function removedRoleIds(entry: GuildAuditLogsEntry): string[] {
  const change = entry.changes?.find((c) => c.key === "$remove");
  const removed = change?.new;
  if (!Array.isArray(removed)) return [];
  return removed.map((r) => (typeof r === "object" && r !== null && "id" in r ? String((r as { id: unknown }).id) : "")).filter(Boolean);
}

async function handleEntry(entry: GuildAuditLogsEntry, guild: Guild, client: BotClient): Promise<void> {
  const config = await getAntiNukeConfig(guild.id);
  if (!config.enabled) return;

  const actorId = entry.executorId;
  if (!actorId || actorId === client.user?.id) return;
  if (isActorWhitelisted(config, actorId)) return;

  const eventName = AuditLogEvent[entry.action] as string | undefined;
  if (!eventName) return;

  const quarantineRoleId = await getQuarantineRoleId(guild.id);

  // --- always-critical, single-occurrence triggers, independent of strict mode / thresholds ---
  if (quarantineRoleId && eventName === "RoleDelete" && entry.targetId === quarantineRoleId) {
    await respond(guild, actorId, config.autoQuarantineOnBreach, "quarantine_role_deleted", {});
    return;
  }
  if (quarantineRoleId && eventName === "RoleUpdate" && entry.targetId === quarantineRoleId) {
    await respond(guild, actorId, config.autoQuarantineOnBreach, "quarantine_role_modified", {});
    return;
  }
  if (eventName === "RoleUpdate" && entry.targetId === guild.id) {
    await respond(guild, actorId, config.autoQuarantineOnBreach, "everyone_role_modified", {});
    return;
  }
  if (eventName === "MemberRoleUpdate" && quarantineRoleId && entry.targetId) {
    if (removedRoleIds(entry).includes(quarantineRoleId)) {
      const activeQuarantine = await getActiveQuarantine(guild.id, entry.targetId);
      if (activeQuarantine) {
        await respond(guild, actorId, config.autoQuarantineOnBreach, "quarantine_bypass_attempt", { targetId: entry.targetId });
        return;
      }
    }
  }

  // --- generic threshold-based tracking ---
  if (!isTrackedDestructiveAction(eventName, config.strictMode)) return;

  if (eventName === "ChannelCreate" || eventName === "ChannelDelete") {
    const changes = entry.changes as { key: string; old?: unknown; new?: unknown }[] | undefined;
    const parentIdChange = changes?.find((c) => c.key === "parent_id");
    const parentId = (parentIdChange?.old ?? parentIdChange?.new) as string | undefined;
    if (isCategoryWhitelisted(config, parentId)) return;
  }

  const now = Date.now();
  const timestamps = recordAction(guild.id, actorId, now);
  const result = checkThresholdBreach(config, timestamps, now);
  if (!result.breached) return;

  await respond(guild, actorId, config.autoQuarantineOnBreach, eventName.toLowerCase(), {
    countLastMinute: result.countLastMinute,
    countLastHour: result.countLastHour,
    window: result.windowBreached,
  });
  clearActor(guild.id, actorId);

  // A wave — several DISTINCT actors each tripping anti-nuke's own threshold in a short window — escalates to panic mode.
  const panicState = await getPanicState(guild.id);
  if (!panicState.active) {
    const panicConfig = await getPanicConfig(guild.id);
    const breaches = recordBreach(guild.id, actorId, now);
    if (checkPanicTrigger(panicConfig, getRecentBreaches(guild.id, now), now)) {
      const distinctActorIds = [...new Set(breaches.map((b) => b.actorId))];
      clearBreaches(guild.id);
      await activatePanic(guild, distinctActorIds);
    }
  }
}
