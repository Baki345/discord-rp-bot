import type { Guild } from "discord.js";
import {
  getPanicConfig,
  startPanic,
  endPanic,
  getLatestBackup,
  planRestore,
  recordRestore,
  startLockdown,
  endLockdown,
  ServiceError,
  GuildStructureSnapshot,
  type ActorContext,
} from "@discord-rp/core";
import { lockChannel, unlockChannel, isLockableChannel, stripDangerousRolePermissions, restoreRolePermissions } from "./lockdown.js";
import { currentStructureIds, applyRestorePlan } from "./backupSnapshot.js";

function systemActor(guildId: string): ActorContext {
  return { guildId, discordUserId: "SYSTEM", source: "discord-bot", isDiscordGuildAdmin: true, rpPermissions: [] };
}

export async function activatePanic(guild: Guild, respondingActorIds: string[]): Promise<void> {
  const config = await getPanicConfig(guild.id);
  const actor = systemActor(guild.id);

  await startPanic(actor, { guildId: guild.id, respondingActorIds }).catch((err) => {
    if (err instanceof ServiceError && err.code === "ALREADY_EXISTS") return;
    throw err;
  });

  if (config.alertRoleId) {
    await guild.systemChannel
      ?.send({ content: `<@&${config.alertRoleId}> 🚨 Mode panique activé — vague de destructions détectée (${respondingActorIds.length} auteur(s)).`, allowedMentions: { roles: [config.alertRoleId] } })
      .catch(() => {});
  }

  if (config.autoLockdownOnActivate) {
    const channels = await guild.channels.fetch();
    const channelPriorOverwrites: Record<string, { view?: boolean | null; send?: boolean | null; connect?: boolean | null }> = {};
    const lockedChannelIds: string[] = [];
    for (const channel of channels.values()) {
      if (!channel || !isLockableChannel(channel)) continue;
      channelPriorOverwrites[channel.id] = lockChannel(channel, false);
      lockedChannelIds.push(channel.id);
    }
    const strippedRolePermissions = await stripDangerousRolePermissions(guild);

    await startLockdown(actor, {
      guildId: guild.id,
      hidden: false,
      fullServer: true,
      lockedChannelIds,
      channelPriorOverwrites,
      autoKickNewMembers: false,
      autoBanNewMembers: true,
      invitesPaused: true,
      strippedRolePermissions,
    }).catch((err) => {
      if (!(err instanceof ServiceError && err.code === "ALREADY_EXISTS")) console.error("[panic] failed to auto-lockdown:", err);
    });
  }

  if (config.autoRestoreLatestBackup) {
    const backup = await getLatestBackup(guild.id);
    if (backup) {
      const parsed = GuildStructureSnapshot.safeParse(backup.snapshot);
      if (parsed.success) {
        const plan = planRestore(currentStructureIds(guild), parsed.data);
        const filteredPlan = {
          channelsToDelete: config.restoreChannels ? plan.channelsToDelete : [],
          channelsToRecreate: config.restoreChannels ? plan.channelsToRecreate : [],
          rolesToDelete: config.restoreRoles ? plan.rolesToDelete : [],
          rolesToRecreate: config.restoreRoles ? plan.rolesToRecreate : [],
        };
        await applyRestorePlan(guild, filteredPlan);
        await recordRestore(actor, { guildId: guild.id, backupId: backup.id, plan: filteredPlan });
      }
    }
  }
}

export async function deactivatePanic(guild: Guild): Promise<void> {
  const actor = systemActor(guild.id);
  const config = await getPanicConfig(guild.id);
  const panicState = await endPanic(actor, guild.id);
  void panicState;

  if (config.autoUnlockOnEnd) {
    const lockdown = await endLockdown(actor, guild.id).catch((err) => {
      if (err instanceof ServiceError && err.code === "NOT_FOUND") return null;
      throw err;
    });
    if (lockdown) {
      for (const [channelId, snapshot] of Object.entries(lockdown.channelPriorOverwrites)) {
        await unlockChannel(guild, channelId, snapshot);
      }
      if (Object.keys(lockdown.strippedRolePermissions).length > 0) {
        await restoreRolePermissions(guild, lockdown.strippedRolePermissions);
      }
    }
  }
}
