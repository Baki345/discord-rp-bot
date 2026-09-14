import type { Guild, GuildMember, NonThreadGuildBasedChannel, PermissionOverwriteOptions } from "discord.js";
import { getQuarantineRoleId, setQuarantineRoleId, startQuarantine, endQuarantine, type ActorContext } from "@discord-rp/core";

const QUARANTINE_ROLE_NAME = "Quarantaine";

const DENY_OVERWRITES: PermissionOverwriteOptions = {
  ViewChannel: false,
  SendMessages: false,
  Connect: false,
  AddReactions: false,
  CreatePublicThreads: false,
  CreatePrivateThreads: false,
};

/** Applied to every channel at setup AND to every newly created channel (see events/channelCreate.ts) — the only reliable way to fully silence a role in Discord's permission model. */
export async function applyQuarantineOverwrites(channel: NonThreadGuildBasedChannel, roleId: string): Promise<void> {
  await channel.permissionOverwrites.edit(roleId, DENY_OVERWRITES).catch((err: unknown) => {
    console.error(`[quarantine] failed to apply overwrite on channel ${channel.id}:`, err);
  });
}

/** Creates the quarantine role (if missing) and applies deny overwrites to every existing channel. Idempotent — safe to re-run. */
export async function setupQuarantineRole(actor: ActorContext, guild: Guild): Promise<string> {
  const existingRoleId = await getQuarantineRoleId(guild.id);
  let role = existingRoleId ? await guild.roles.fetch(existingRoleId).catch(() => null) : null;

  if (!role) {
    role = await guild.roles.create({
      name: QUARANTINE_ROLE_NAME,
      color: 0x4a4a4a,
      permissions: [],
      reason: "Mise en place du système de quarantaine",
    });
    await setQuarantineRoleId(actor, { guildId: guild.id, roleId: role.id });
  }

  const channels = await guild.channels.fetch();
  for (const channel of channels.values()) {
    if (channel) await applyQuarantineOverwrites(channel, role.id);
  }

  return role.id;
}

export async function quarantineMember(actor: ActorContext, member: GuildMember, reason?: string): Promise<void> {
  const roleId = await getQuarantineRoleId(member.guild.id);
  if (!roleId) throw new Error("Le rôle de quarantaine n'est pas configuré — lance /securite quarantaine setup d'abord.");

  const priorRoleIds = member.roles.cache.filter((r) => r.id !== member.guild.id).map((r) => r.id);
  await startQuarantine(actor, { guildId: member.guild.id, discordUserId: member.id, priorRoleIds, reason });

  await member.roles.set([roleId], reason ?? "Mise en quarantaine");
}

export async function releaseMember(actor: ActorContext, member: GuildMember, reason?: string): Promise<void> {
  const priorRoleIds = await endQuarantine(actor, { guildId: member.guild.id, discordUserId: member.id, reason });
  await member.roles.set(priorRoleIds, reason ?? "Fin de quarantaine").catch(async (err) => {
    console.error(`[quarantine] failed to restore roles for ${member.id}, removing quarantine role only:`, err);
    const roleId = await getQuarantineRoleId(member.guild.id);
    if (roleId) await member.roles.remove(roleId).catch(() => {});
  });
}
