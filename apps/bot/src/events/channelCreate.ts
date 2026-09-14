import { Events, type NonThreadGuildBasedChannel } from "discord.js";
import { getQuarantineRoleId } from "@discord-rp/core";
import type { BotClient } from "../client.js";
import { applyQuarantineOverwrites } from "../security/quarantine.js";

/** Every new channel automatically gets the quarantine role's deny overwrites — otherwise quarantine would silently leak on any channel created after setup. */
export function registerChannelCreateEvent(client: BotClient) {
  client.on(Events.ChannelCreate, async (channel: NonThreadGuildBasedChannel) => {
    try {
      const roleId = await getQuarantineRoleId(channel.guild.id);
      if (roleId) await applyQuarantineOverwrites(channel, roleId);
    } catch (err) {
      console.error("[quarantine] channelCreate auto-overwrite failed:", err);
    }
  });
}
