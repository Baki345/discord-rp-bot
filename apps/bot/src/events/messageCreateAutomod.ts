import { ChannelType, Events, type Message } from "discord.js";
import {
  getAutomodConfig,
  processMessage,
  isPanicActive,
  isMentionFloodTriggered,
  writeAuditLog,
  type MessageFeatures,
  type AutomodConfig,
} from "@discord-rp/core";
import type { BotClient } from "../client.js";
import { heatKey, getHeatState, setHeatState, recordStrike, getRecentStrikeTimestamps, isMemberFlagged, recordMentions, getRecentMentionTimestamps, canTriggerMentionFloodLockdown, markMentionFloodLockdownTriggered } from "../security/heatTracker.js";
import { recordChannelMessage, isLowActivityChannel, isRepeatOfLastMessage } from "../security/messageActivity.js";

const URL_PATTERN = /https?:\/\/([a-z0-9.-]+)/gi;
const EMOJI_PATTERN = /<a?:\w+:\d+>|\p{Extended_Pictographic}/gu;
const MENTION_FLOOD_LOCKDOWN_COOLDOWN_MS = 5 * 60_000;

function extractDomains(content: string): string[] {
  return [...content.matchAll(URL_PATTERN)].map((m) => m[1]!.toLowerCase());
}

function matchesAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => n.trim().length > 0 && lower.includes(n.trim().toLowerCase()));
}

function buildFeatures(message: Message, config: AutomodConfig, nowMs: number): MessageFeatures {
  const content = message.content ?? "";
  const domains = extractDomains(content);
  const isForumPost = message.channel.isThread() && message.channel.parent?.type === ChannelType.GuildForum;

  return {
    charCount: content.length,
    newlineCount: (content.match(/\n/g) ?? []).length,
    emojiCount: (content.match(EMOJI_PATTERN) ?? []).length,
    mentionEveryone: message.mentions.everyone,
    roleMentionCount: message.mentions.roles.size,
    userMentionCount: message.mentions.users.size,
    attachmentCount: message.attachments.size,
    isRepeatOfRecent: isRepeatOfLastMessage(heatKey(message.guildId!, message.author.id), content),
    matchedBlacklistedWord: matchesAny(content, config.wordBlacklist),
    matchedBlacklistedDomain: domains.some((d) => config.domainBlacklist.some((bad) => d.endsWith(bad.toLowerCase()))),
    hasAnyLink: domains.length > 0,
    isWebhook: message.webhookId !== null,
    isLowActivityChannel: isLowActivityChannel(message.channelId, nowMs),
    isForumPost,
  };
}

async function timeoutMember(message: Message, minutes: number, reason: string): Promise<void> {
  const member = message.member ?? (await message.guild!.members.fetch(message.author.id).catch(() => null));
  if (!member?.moderatable) return;
  await member.timeout(minutes * 60_000, reason).catch((err) => console.error("[automod] failed to timeout member:", err));
}

async function triggerMentionFloodLockdown(message: Message, guildId: string, nowMs: number): Promise<void> {
  if (!canTriggerMentionFloodLockdown(guildId, nowMs, MENTION_FLOOD_LOCKDOWN_COOLDOWN_MS)) return;
  markMentionFloodLockdownTriggered(guildId, nowMs);

  const channel = message.channel;
  if (channel.type === ChannelType.GuildText) {
    await channel.permissionOverwrites.edit(guildId, { SendMessages: false }).catch(() => {});
  }

  await writeAuditLog({
    guildId,
    actorType: "SYSTEM",
    action: "automod.mention_flood_lockdown",
    targetType: "Channel",
    targetId: message.channelId,
  });
}

/** Requires the Message Content Intent to read message text — a hard requirement flagged separately, not a code gap. */
export function registerMessageCreateAutomodEvent(client: BotClient) {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (!message.inGuild() || message.author.id === client.user?.id) return;
    try {
      await handleMessage(message);
    } catch (err) {
      console.error("[automod] failed to process message:", err);
    }
  });
}

async function handleMessage(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const config = await getAutomodConfig(guildId);
  const now = Date.now();

  recordChannelMessage(message.channelId, now);

  const mentionCount = (message.mentions.everyone ? 1 : 0) + message.mentions.roles.size + message.mentions.users.size;
  recordMentions(guildId, mentionCount, now);
  if (config.enabled && isMentionFloodTriggered(getRecentMentionTimestamps(guildId, now), config, now)) {
    await triggerMentionFloodLockdown(message, guildId, now);
  }

  if (!config.enabled) return;

  // Panic sub-mode bypasses the heat curve entirely for already-flagged raiders.
  if (isPanicActive(getRecentStrikeTimestamps(guildId, now), config, now) && isMemberFlagged(guildId, message.author.id, now)) {
    await timeoutMember(message, config.capTimeoutMinutes, "Mode panique auto-modération : raider déjà signalé");
    return;
  }

  const key = heatKey(guildId, message.author.id);
  const features = buildFeatures(message, config, now);
  const state = getHeatState(key);
  const result = processMessage(config, state, features, now);
  setHeatState(key, result.newState);

  if (!result.shouldTimeout) return;

  recordStrike(guildId, message.author.id, now, config.panicWindowSeconds * 1000);
  await writeAuditLog({
    guildId,
    actorType: "SYSTEM",
    action: "automod.strike",
    targetType: "DiscordMember",
    targetId: message.author.id,
    metadata: { heat: result.newState.heat, strikes: result.newState.strikes, timeoutMinutes: result.timeoutMinutes, cap: result.isCapTimeout },
  });
  await timeoutMember(message, result.timeoutMinutes, `Auto-modération : chaleur excessive (${result.isCapTimeout ? "cap" : "normal"})`);
}
