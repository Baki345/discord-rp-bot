import { ChannelType, PermissionFlagsBits, type Guild, type NonThreadGuildBasedChannel } from "discord.js";
import type { LockdownState } from "@discord-rp/core";

type ChannelOverwriteSnapshot = LockdownState["channelPriorOverwrites"][string];

/** Captures @everyone's current explicit overwrite for the relevant permissions (null = no explicit overwrite existed, i.e. inherited) before denying them. */
export function lockChannel(channel: NonThreadGuildBasedChannel, hidden: boolean): ChannelOverwriteSnapshot {
  const everyoneId = channel.guild.id;
  const existing = channel.permissionOverwrites.cache.get(everyoneId);

  const snapshot: ChannelOverwriteSnapshot = {
    view: existing?.deny.has(PermissionFlagsBits.ViewChannel) ? false : existing?.allow.has(PermissionFlagsBits.ViewChannel) ? true : null,
    send: existing?.deny.has(PermissionFlagsBits.SendMessages) ? false : existing?.allow.has(PermissionFlagsBits.SendMessages) ? true : null,
    connect: existing?.deny.has(PermissionFlagsBits.Connect) ? false : existing?.allow.has(PermissionFlagsBits.Connect) ? true : null,
  };

  const deny: Record<string, boolean> = { SendMessages: false, Connect: false };
  if (hidden) deny.ViewChannel = false;
  void channel.permissionOverwrites.edit(everyoneId, deny).catch((err: unknown) => console.error(`[lockdown] failed to lock channel ${channel.id}:`, err));

  return snapshot;
}

/** null in the snapshot means "no explicit overwrite existed" — passing null back to permissionOverwrites.edit clears that specific field instead of setting it. */
export async function unlockChannel(guild: Guild, channelId: string, snapshot: ChannelOverwriteSnapshot): Promise<void> {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.isThread()) return;
  await channel.permissionOverwrites
    .edit(guild.id, { ViewChannel: snapshot.view ?? null, SendMessages: snapshot.send ?? null, Connect: snapshot.connect ?? null })
    .catch((err: unknown) => console.error(`[lockdown] failed to unlock channel ${channelId}:`, err));
}

export function isLockableChannel(channel: NonThreadGuildBasedChannel): boolean {
  return channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildAnnouncement;
}

const DANGEROUS_BITS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.MentionEveryone,
];

/** Strips dangerous permissions from every role the bot can manage (excludes @everyone, managed/integration roles, and anything above the bot's own role — Discord's API would reject those anyway). Returns roleId -> original bitfield string, to restore later. */
export async function stripDangerousRolePermissions(guild: Guild): Promise<Record<string, string>> {
  const stripped: Record<string, string> = {};
  const roles = await guild.roles.fetch();

  for (const role of roles.values()) {
    if (role.id === guild.id || role.managed || !role.editable) continue;
    const hasAnyDangerous = DANGEROUS_BITS.some((bit) => role.permissions.has(bit));
    if (!hasAnyDangerous) continue;

    stripped[role.id] = role.permissions.bitfield.toString();
    const updated = role.permissions.remove(DANGEROUS_BITS);
    await role.setPermissions(updated).catch((err: unknown) => console.error(`[lockdown] failed to strip permissions on role ${role.id}:`, err));
  }

  return stripped;
}

export async function restoreRolePermissions(guild: Guild, stripped: Record<string, string>): Promise<void> {
  for (const [roleId, bitfield] of Object.entries(stripped)) {
    const role = await guild.roles.fetch(roleId).catch(() => null);
    if (!role) continue;
    await role.setPermissions(BigInt(bitfield)).catch((err) => console.error(`[lockdown] failed to restore permissions on role ${roleId}:`, err));
  }
}

/** Deleting every active invite is the closest Discord's API gets to "pausing" invites — there's no native toggle. Existing invite codes stop working; staff can still mint new ones (that's an inherent limitation, not a bug). */
export async function pauseInvites(guild: Guild): Promise<void> {
  const invites = await guild.invites.fetch().catch(() => null);
  if (!invites) return;
  for (const invite of invites.values()) {
    await invite.delete("Lockdown : pause des invitations").catch(() => {});
  }
}
