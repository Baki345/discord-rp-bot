import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type MessageCreateOptions } from "discord.js";
import type { MessageTemplateContent } from "@discord-rp/core";

/** Converts a saved MessageTemplateContent into the exact payload shape discord.js expects for both a channel.send() and a webhook.send(). */
export function buildMessagePayload(content: MessageTemplateContent): MessageCreateOptions {
  const embeds = content.embeds.map((e) => {
    const embed = new EmbedBuilder();
    if (e.title) embed.setTitle(e.title);
    if (e.description) embed.setDescription(e.description);
    if (e.color) embed.setColor(parseInt(e.color.slice(1), 16));
    if (e.footerText) embed.setFooter({ text: e.footerText });
    if (e.imageUrl) embed.setImage(e.imageUrl);
    return embed;
  });

  const components = content.buttonRows.map((row) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      row.map((b) => {
        const button = new ButtonBuilder().setLabel(b.label).setStyle(ButtonStyle.Link).setURL(b.url);
        if (b.emoji) button.setEmoji(b.emoji);
        return button;
      }),
    ),
  );

  return {
    content: content.content || undefined,
    embeds,
    components,
  };
}
