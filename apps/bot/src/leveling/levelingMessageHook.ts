import { Events, type Message } from "discord.js";
import { getLevelingConfig, addTextXp } from "@discord-rp/core";
import type { BotClient } from "../client.js";
import { applyLevelUpEffects } from "./levelUpAnnounce.js";

export function registerLevelingMessageHookEvent(client: BotClient) {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (!message.inGuild() || message.author.bot) return;

    const config = await getLevelingConfig(message.guildId);
    if (!config.enabled) return;

    const result = await addTextXp(message.guildId, message.author.id, config, new Date());
    if (result?.leveledUp) {
      await applyLevelUpEffects(message.guild!, message.author.id, result);
      if (message.channel.isSendable()) {
        await message.channel.send(`🎉 <@${message.author.id}> passe niveau **${result.level}** !`).catch(() => {});
      }
    }
  });
}
