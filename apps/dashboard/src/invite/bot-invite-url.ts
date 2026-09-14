import { loadEnv } from "@discord-rp/config";

/**
 * Kept in sync with the real Discord permissions apps/bot/src actually uses
 * (ban/kick/timeout, channel+role management for tickets/quarantine/
 * lockdown, webhooks for the message builder, nickname cleanup for
 * dehoisting, audit log reads for anti-nuke) — not Administrator, so a
 * server owner installing the bot can see exactly what's being granted.
 * ViewChannel, SendMessages, EmbedLinks, AttachFiles, ReadMessageHistory,
 * ManageMessages, ManageChannels, ManageRoles, ManageWebhooks,
 * ManageNicknames, KickMembers, BanMembers, ModerateMembers, ViewAuditLog.
 */
const BOT_INVITE_PERMISSIONS = "1100451277974";

/** Null when DISCORD_CLIENT_ID isn't configured yet — callers hide the invite link/button in that case. */
export function getBotInviteUrl(): string | null {
  const clientId = loadEnv().DISCORD_CLIENT_ID;
  if (!clientId) return null;
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${BOT_INVITE_PERMISSIONS}&scope=bot+applications.commands`;
}
