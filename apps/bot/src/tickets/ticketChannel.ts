import { ChannelType, PermissionFlagsBits, type Guild, type TextChannel } from "discord.js";
import type { TicketCategory } from "@discord-rp/database";
import type { TranscriptMessage } from "@discord-rp/core";

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

const TRANSCRIPT_MESSAGE_CAP = 500;

/** Paginates the channel's full history (oldest first), capped at 500 messages — bounds the cost for a runaway ticket rather than fetching forever. */
export async function compileTranscript(channel: TextChannel): Promise<TranscriptMessage[]> {
  const collected: TranscriptMessage[] = [];
  let before: string | undefined;

  while (collected.length < TRANSCRIPT_MESSAGE_CAP) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (batch.size === 0) break;

    for (const message of batch.values()) {
      collected.push({
        authorId: message.author.id,
        authorTag: message.author.tag,
        content: message.content,
        attachmentUrls: [...message.attachments.values()].map((a) => a.url),
        createdAt: message.createdAt.toISOString(),
      });
    }
    before = batch.last()?.id;
    if (batch.size < 100) break;
  }

  return collected.reverse();
}
