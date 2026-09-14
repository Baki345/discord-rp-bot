import { AuditLogEvent, Events, UserFlagsBitField, type GuildMember } from "discord.js";
import { getJoinGateConfig, evaluateJoinGate, pickStrictestAction, writeAuditLog, type JoinGateMemberInfo } from "@discord-rp/core";
import type { BotClient } from "../client.js";

const FIXED_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000; // Discord's own timeout cap

async function findBotAdder(member: GuildMember): Promise<string | undefined> {
  if (!member.user.bot) return undefined;
  try {
    const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 });
    const entry = logs.entries.find((e) => e.target?.id === member.id);
    return entry?.executor?.id;
  } catch {
    return undefined;
  }
}

/**
 * Requires the Server Members Intent to receive this event reliably for
 * every join — a hard requirement flagged separately, not a code gap.
 */
export function registerGuildMemberAddEvent(client: BotClient) {
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      await handleJoin(member);
    } catch (err) {
      console.error("[join-gate] failed to evaluate join gate:", err);
    }
  });
}

async function handleJoin(member: GuildMember): Promise<void> {
  const config = await getJoinGateConfig(member.guild.id);

  const info: JoinGateMemberInfo = {
    username: member.user.username,
    hasAvatar: member.user.avatar !== null,
    accountCreatedAt: member.user.createdAt,
    isBot: member.user.bot,
    isVerifiedBot: member.user.flags?.has(UserFlagsBitField.Flags.VerifiedBot) ?? false,
    adderDiscordId: await findBotAdder(member),
  };

  const triggers = evaluateJoinGate(config, info);
  if (triggers.length === 0) return;

  const strictest = pickStrictestAction(triggers);
  const reason = `Porte d'entrée : ${triggers.map((t) => t.filter).join(", ")}`;

  for (const trigger of triggers) {
    await writeAuditLog({
      guildId: member.guild.id,
      actorType: "SYSTEM",
      action: `joingate.${trigger.filter}`,
      targetType: "DiscordMember",
      targetId: member.id,
      metadata: { username: info.username, action: trigger.action },
    });
  }

  if (!strictest) return;

  if (strictest.filter === "minAccountAge" && config.minAccountAge?.dmMinimumAge) {
    await member
      .send(`Ton compte doit avoir au moins ${config.minAccountAge.minutes} minute(s) pour rejoindre **${member.guild.name}**.`)
      .catch(() => {});
  }

  try {
    switch (strictest.action) {
      case "LOG":
        break;
      case "TIMEOUT":
        await member.timeout(FIXED_TIMEOUT_MS, reason);
        break;
      case "KICK":
        await member.kick(reason);
        break;
      case "BAN":
        await member.ban({ reason });
        break;
    }
  } catch (err) {
    console.error(`[join-gate] failed to apply action ${strictest.action} to ${member.id}:`, err);
  }
}
