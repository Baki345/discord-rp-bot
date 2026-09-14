import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getShop, ServiceError } from "@discord-rp/core";

export async function executeVoir(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const shopId = interaction.options.getString("boutique", true);

  try {
    const shop = await getShop(interaction.guildId!, shopId);
    const embed = new EmbedBuilder()
      .setTitle(`🏪 ${shop.name}`)
      .setColor(0x7c3aed)
      .setDescription(
        shop.products.length === 0
          ? "Aucun article en vente."
          : shop.products
              .map((p) => `**${p.item.name}** — ${(p.priceCents / 100).toFixed(2)} $${p.stock !== null ? ` (stock : ${p.stock})` : ""}`)
              .join("\n"),
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Cette boutique n'existe pas.", ephemeral: true });
      return;
    }
    throw e;
  }
}
