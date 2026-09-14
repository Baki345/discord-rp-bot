import { Events, type Message } from "discord.js";
import { getTicketByChannelId, touchTicketActivity } from "@discord-rp/core";
import type { BotClient } from "../client.js";

/** Bumps Ticket.lastActivityAt on every message inside a ticket channel — read by the auto-close ticker to know a ticket is still active. */
export function registerMessageCreateTicketActivityEvent(client: BotClient) {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (!message.inGuild() || message.author.bot) return;

    const ticket = await getTicketByChannelId(message.channelId);
    if (ticket && ticket.status !== "CLOSED") {
      await touchTicketActivity(ticket.id);
    }
  });
}
