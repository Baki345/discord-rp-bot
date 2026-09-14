import { ChannelType, type Client } from "discord.js";
import { sweepInactiveTickets } from "@discord-rp/core";
import { lockTicketChannel } from "./ticketChannel.js";

const TICK_INTERVAL_MS = 5 * 60 * 1000;

/** Closes tickets past their category's inactivity threshold every 5 minutes, then locks each channel — mirrors M10's needs ticker shape. */
export function startTicketAutoCloseTicker(client: Client) {
  const tick = async () => {
    try {
      const closed = await sweepInactiveTickets();
      for (const ticket of closed) {
        const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
        if (channel?.type === ChannelType.GuildText) {
          await lockTicketChannel(channel, ticket.openerDiscordId);
          await channel.send("🔒 Ticket fermé automatiquement pour inactivité.").catch(() => {});
        }
      }
    } catch (err) {
      console.error("[ticket-auto-close-ticker] tick failed:", err);
    }
  };
  setInterval(tick, TICK_INTERVAL_MS);
}
