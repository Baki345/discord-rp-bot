import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction, type SlashCommandSubcommandBuilder } from "discord.js";
import { listShops, getShop } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeVoir } from "./voir.js";
import { executeAcheter } from "./acheter.js";
import { executeVendre } from "./vendre.js";

function addShopAndItemOptions(builder: SlashCommandSubcommandBuilder) {
  return builder
    .addStringOption((opt) => opt.setName("boutique").setDescription("La boutique").setRequired(true).setAutocomplete(true))
    .addStringOption((opt) => opt.setName("article").setDescription("L'article").setRequired(true).setAutocomplete(true))
    .addIntegerOption((opt) => opt.setName("quantite").setDescription("Quantité").setRequired(true).setMinValue(1));
}

export const boutiqueCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("boutique")
    .setDescription("Acheter et vendre dans les boutiques du serveur")
    .addSubcommand((sub) =>
      sub
        .setName("voir")
        .setDescription("Voir le catalogue d'une boutique")
        .addStringOption((opt) => opt.setName("boutique").setDescription("La boutique").setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) => addShopAndItemOptions(sub.setName("acheter").setDescription("Acheter un article")))
    .addSubcommand((sub) => addShopAndItemOptions(sub.setName("vendre").setDescription("Vendre un article de ton inventaire"))),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "voir") return executeVoir(interaction);
    if (sub === "acheter") return executeAcheter(interaction);
    if (sub === "vendre") return executeVendre(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    const focused = interaction.options.getFocused(true);
    const search = String(focused.value).toLowerCase();

    if (focused.name === "boutique") {
      const shops = await listShops(interaction.guildId!);
      const filtered = shops
        .filter((s) => s.name.toLowerCase().includes(search))
        .slice(0, 25)
        .map((s) => ({ name: s.name, value: s.id }));
      await interaction.respond(filtered);
      return;
    }

    if (focused.name === "article") {
      const shopId = interaction.options.getString("boutique");
      if (!shopId) return interaction.respond([]);
      try {
        const shop = await getShop(interaction.guildId!, shopId);
        const filtered = shop.products
          .filter((p) => p.item.name.toLowerCase().includes(search))
          .slice(0, 25)
          .map((p) => ({ name: `${p.item.name} — ${(p.priceCents / 100).toFixed(2)} $`, value: p.itemId }));
        await interaction.respond(filtered);
      } catch {
        await interaction.respond([]);
      }
    }
  },
};
