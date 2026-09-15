import { Events, type Guild, type GuildMember } from "discord.js";
import {
  getJoinRaidConfig,
  detectJoinRaid,
  recordJoinRaidIncident,
  writeAuditLog,
  getLockdownState,
  startLockdown,
  type ActorContext,
  type JoinRaidMemberInfo,
} from "@discord-rp/core";
import type { BotClient } from "../client.js";
import { recordJoin, getRecentJoins, markRaidActiveUntil, isRaidActive } from "../security/joinRaidTracker.js";
import { pauseInvites } from "../security/lockdown.js";

async function applyAction(member: GuildMember, action: string, reason: string): Promise<void> {
  try {
    switch (action) {
      case "LOG":
        break;
      case "TIMEOUT":
        await member.timeout(24 * 60 * 60 * 1000, reason);
        break;
      case "KICK":
        await member.kick(reason);
        break;
      case "BAN":
        await member.ban({ reason });
        break;
    }
  } catch (err) {
    console.error(`[join-raid] failed to apply ${action} to ${member.id}:`, err);
  }
}

async function pingAlertRole(member: GuildMember, roleId: string | null | undefined, message: string) {
  if (!roleId) return;
  const systemChannel = member.guild.systemChannel;
  if (!systemChannel) return;
  await systemChannel.send({ content: `<@&${roleId}> ${message}`, allowedMentions: { roles: [roleId] } }).catch(() => {});
}

function systemActor(guildId: string): ActorContext {
  return { guildId, discordUserId: "SYSTEM", source: "discord-bot", isDiscordGuildAdmin: true, rpPermissions: [] };
}

/**
 * The stronger response beyond individually kicking/banning matched
 * joiners: pauses invites and blocks every new arrival via the same
 * mechanism `/lockdown serveur` uses — but touches no channels or roles,
 * since a raid response shouldn't also disrupt every ongoing conversation.
 * Does nothing if a lockdown (manual or a prior raid) is already active,
 * and deliberately never auto-lifts — staff must run `/lockdown fin` once
 * they've confirmed the raid is over.
 */
async function triggerRaidLockdown(guild: Guild, raidAction: string): Promise<boolean> {
  const state = await getLockdownState(guild.id);
  if (state.active) return false;

  await pauseInvites(guild);
  await startLockdown(systemActor(guild.id), {
    guildId: guild.id,
    hidden: false,
    fullServer: false,
    lockedChannelIds: [],
    channelPriorOverwrites: {},
    autoKickNewMembers: raidAction !== "BAN",
    autoBanNewMembers: raidAction === "BAN",
    invitesPaused: true,
    strippedRolePermissions: {},
  });
  return true;
}

/** Requires the Server Members Intent, same as join-gate (M24). */
export function registerJoinRaidDetectionEvent(client: BotClient) {
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      await handleJoin(member);
    } catch (err) {
      console.error("[join-raid] detection failed:", err);
    }
  });
}

async function handleJoin(member: GuildMember): Promise<void> {
  const config = await getJoinRaidConfig(member.guild.id);
  if (!config.enabled) return;

  const info: JoinRaidMemberInfo = {
    discordUserId: member.id,
    joinedAt: new Date(),
    accountCreatedAt: member.user.createdAt,
    hasAvatar: member.user.avatar !== null,
  };
  recordJoin(member.guild.id, info);

  if (isRaidActive(member.guild.id)) {
    await writeAuditLog({
      guildId: member.guild.id,
      actorType: "SYSTEM",
      action: "joinraid.subsequent",
      targetType: "DiscordMember",
      targetId: member.id,
    });
    await applyAction(member, config.action, "Raid d'arrivées en cours");
    return;
  }

  const result = detectJoinRaid(config, getRecentJoins(member.guild.id));
  if (!result.triggered) return;

  markRaidActiveUntil(member.guild.id, new Date(Date.now() + config.subsequentWindowSeconds * 1000));
  await recordJoinRaidIncident(member.guild.id, result.matchedMemberIds, result.reason);
  await writeAuditLog({
    guildId: member.guild.id,
    actorType: "SYSTEM",
    action: "joinraid.triggered",
    metadata: { matchedMemberIds: result.matchedMemberIds, reason: result.reason },
  });

  let lockdownEngaged = false;
  if (config.autoLockdownOnTrigger) {
    lockdownEngaged = await triggerRaidLockdown(member.guild, config.action).catch((err: unknown) => {
      console.error("[join-raid] failed to engage auto-lockdown:", err);
      return false;
    });
    if (lockdownEngaged) {
      await writeAuditLog({
        guildId: member.guild.id,
        actorType: "SYSTEM",
        action: "joinraid.auto_lockdown_engaged",
        metadata: { reason: result.reason },
      });
    }
  }

  await pingAlertRole(
    member,
    config.alertRoleId,
    `Raid d'arrivées détecté (${result.matchedMemberIds.length} comptes) — ${result.reason}` +
      (lockdownEngaged ? " — **verrouillage automatique du serveur activé**, utilise `/lockdown fin` une fois la situation confirmée sûre." : ""),
  );

  for (const id of result.matchedMemberIds) {
    const target = await member.guild.members.fetch(id).catch(() => null);
    if (target) await applyAction(target, config.action, `Raid d'arrivées détecté : ${result.reason}`);
  }
}
