import { ChannelType, PermissionFlagsBits, type Guild, type TextChannel } from "discord.js";
import type { TicketCategory } from "@discord-rp/database";

function roleIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Creates the actual Discord channel for a new ticket — packages/core only persists the Ticket row, it never touches discord.js. */
export async function createTicketChannel(guild: Guild, category: TicketCategory, openerDiscordId: string, index: number): Promise<TextChannel> {
  const supportRoles = roleIds(category.supportRoleIds);

  const channel = await guild.channels.create({
    name: `ticket-${index}`,
    type: ChannelType.GuildText,
    parent: category.discordCategoryId ?? undefined,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: openerDiscordId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      ...supportRoles.map((roleId) => ({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      })),
    ],
    reason: `Ouverture de ticket — catégorie ${category.name}`,
  });

  return channel;
}

/** Re-applies the same overwrite set after a transfer to a different category. */
export async function applyTicketCategoryOverwrites(channel: TextChannel, category: TicketCategory, openerDiscordId: string): Promise<void> {
  const supportRoles = roleIds(category.supportRoleIds);
  await channel.permissionOverwrites.set([
    { id: channel.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: openerDiscordId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    ...supportRoles.map((roleId) => ({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    })),
  ]);
  if (category.discordCategoryId) await channel.setParent(category.discordCategoryId, { lockPermissions: false }).catch(() => {});
}

/** On close, revoke the opener's SendMessages so the channel stops accepting new messages while staff can still read/discuss it — actual deletion happens after the transcript is captured. */
export async function lockTicketChannel(channel: TextChannel, openerDiscordId: string): Promise<void> {
  await channel.permissionOverwrites.edit(openerDiscordId, { SendMessages: false }).catch(() => {});
}
