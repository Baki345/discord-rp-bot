import { ChannelType, type Guild } from "discord.js";
import type { GuildStructureSnapshot, RestorePlan } from "@discord-rp/core";

export async function captureGuildSnapshot(guild: Guild): Promise<GuildStructureSnapshot> {
  const [channels, roles] = await Promise.all([guild.channels.fetch(), guild.roles.fetch()]);

  return {
    channels: [...channels.values()]
      .filter((c) => c !== null)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId,
        position: "position" in c ? c.position : 0,
        overwrites: [...c.permissionOverwrites.cache.values()].map((o) => ({
          id: o.id,
          type: o.type,
          allow: o.allow.bitfield.toString(),
          deny: o.deny.bitfield.toString(),
        })),
      })),
    roles: [...roles.values()]
      .filter((r) => r.id !== guild.id && !r.managed)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        permissions: r.permissions.bitfield.toString(),
        position: r.position,
        hoist: r.hoist,
        mentionable: r.mentionable,
      })),
  };
}

export function currentStructureIds(guild: Guild): { channelIds: string[]; roleIds: string[] } {
  return {
    channelIds: [...guild.channels.cache.keys()],
    roleIds: [...guild.roles.cache.keys()].filter((id) => id !== guild.id && !guild.roles.cache.get(id)?.managed),
  };
}

export async function applyRestorePlan(guild: Guild, plan: RestorePlan): Promise<void> {
  // Recreate missing roles first — channels reference them via permission overwrites.
  const recreatedRoleIds = new Map<string, string>();
  for (const role of plan.rolesToRecreate) {
    const created = await guild.roles
      .create({
        name: role.name,
        color: role.color,
        permissions: BigInt(role.permissions),
        hoist: role.hoist,
        mentionable: role.mentionable,
        reason: "Restauration de sauvegarde",
      })
      .catch((err) => {
        console.error(`[backup] failed to recreate role ${role.name}:`, err);
        return null;
      });
    if (created) recreatedRoleIds.set(role.id, created.id);
  }

  for (const roleId of plan.rolesToDelete) {
    const role = await guild.roles.fetch(roleId).catch(() => null);
    if (role && !role.managed) await role.delete("Restauration de sauvegarde").catch(() => {});
  }

  for (const channel of plan.channelsToRecreate) {
    await guild.channels
      .create({
        name: channel.name,
        type: channel.type === ChannelType.GuildVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
        parent: channel.parentId ?? undefined,
        reason: "Restauration de sauvegarde",
      })
      .catch((err) => console.error(`[backup] failed to recreate channel ${channel.name}:`, err));
  }

  for (const channelId of plan.channelsToDelete) {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (channel) await channel.delete("Restauration de sauvegarde").catch(() => {});
  }
}
