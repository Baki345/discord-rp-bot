import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listInventory, getActiveCharacter } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeVoir } from "./voir.js";
import { executeUtiliser } from "./utiliser.js";
import { executeDonner } from "./donner.js";
import { executeJeter } from "./jeter.js";

export const inventaireCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("inventaire")
    .setDescription("Gérer l'inventaire de ton personnage actif")
    .addSubcommand((sub) => sub.setName("voir").setDescription("Voir ton inventaire"))
    .addSubcommand((sub) =>
      sub
        .setName("utiliser")
        .setDescription("Consommer un objet de ton inventaire")
        .addStringOption((opt) => opt.setName("article").setDescription("L'objet à utiliser").setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("donner")
        .setDescription("Donner un objet à un autre joueur")
        .addUserOption((opt) => opt.setName("joueur").setDescription("Le joueur qui reçoit l'objet").setRequired(true))
        .addStringOption((opt) => opt.setName("article").setDescription("L'objet à donner").setRequired(true).setAutocomplete(true))
        .addIntegerOption((opt) => opt.setName("quantite").setDescription("Quantité").setRequired(true).setMinValue(1)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("jeter")
        .setDescription("Jeter un objet de ton inventaire")
        .addStringOption((opt) => opt.setName("article").setDescription("L'objet à jeter").setRequired(true).setAutocomplete(true))
        .addIntegerOption((opt) => opt.setName("quantite").setDescription("Quantité").setRequired(true).setMinValue(1)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "voir") return executeVoir(interaction);
    if (sub === "utiliser") return executeUtiliser(interaction);
    if (sub === "donner") return executeDonner(interaction);
    if (sub === "jeter") return executeJeter(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    if (interaction.options.getFocused(true).name !== "article") return;
    const search = String(interaction.options.getFocused(true).value).toLowerCase();

    const character = await getActiveCharacter(interaction.guildId!, interaction.user.id);
    if (!character) return interaction.respond([]);

    const items = await listInventory(interaction.guildId!, character.id);
    const filtered = items
      .filter((i) => i.item.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((i) => ({ name: `${i.item.name} × ${i.quantity}`, value: i.itemId }));
    await interaction.respond(filtered);
  },
};
