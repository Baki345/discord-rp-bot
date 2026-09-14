import { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, type TextChannel } from "discord.js";
import { setTicketPanelMessageId } from "@discord-rp/core";
import type { TicketCategory, TicketPanel } from "@discord-rp/database";

export function buildPanelPayload(panel: TicketPanel, categories: TicketCategory[]) {
  const embed = new EmbedBuilder().setTitle(panel.title).setColor(0x7c3aed);
  if (panel.description) embed.setDescription(panel.description);

  if (categories.length === 0) {
    return { embeds: [embed], components: [] };
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`ticket:open:${panel.id}`)
    .setPlaceholder("Choisis une catégorie pour ouvrir un ticket")
    .addOptions(
      categories.slice(0, 25).map((c) => ({
        label: c.name,
        value: c.id,
        emoji: c.emoji ?? undefined,
      })),
    );

  return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)] };
}

/** Posts a new panel message, or edits the existing one in place if it was already published — idempotent, safe to call again after editing categories. */
export async function postOrUpdatePanel(channel: TextChannel, panel: TicketPanel, categories: TicketCategory[]): Promise<void> {
  const payload = buildPanelPayload(panel, categories);

  if (panel.messageId) {
    const existing = await channel.messages.fetch(panel.messageId).catch(() => null);
    if (existing) {
      await existing.edit(payload);
      return;
    }
  }

  const message = await channel.send(payload);
  await setTicketPanelMessageId(panel.id, message.id);
}
