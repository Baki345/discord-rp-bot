import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listPlaces } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeCreer } from "./creer.js";
import { executeListe } from "./liste.js";
import { executeInfo } from "./info.js";
import { executeEntrer } from "./entrer.js";

export const lieuCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("lieu")
    .setDescription("Gérer les lieux du serveur")
    .addSubcommand((sub) =>
      sub
        .setName("creer")
        .setDescription("Créer un lieu (staff)")
        .addStringOption((opt) => opt.setName("nom").setDescription("Nom du lieu").setRequired(true))
        .addStringOption((opt) => opt.setName("categorie").setDescription("Catégorie (ex. commerce, résidence)").setRequired(false))
        .addStringOption((opt) => opt.setName("description").setDescription("Description").setRequired(false)),
    )
    .addSubcommand((sub) => sub.setName("liste").setDescription("Lister les lieux du serveur"))
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Voir les détails d'un lieu")
        .addStringOption((opt) => opt.setName("lieu").setDescription("Le lieu").setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("entrer")
        .setDescription("Tenter d'entrer dans un lieu")
        .addStringOption((opt) => opt.setName("lieu").setDescription("Le lieu").setRequired(true).setAutocomplete(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "creer") return executeCreer(interaction);
    if (sub === "liste") return executeListe(interaction);
    if (sub === "info") return executeInfo(interaction);
    if (sub === "entrer") return executeEntrer(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    if (interaction.options.getFocused(true).name !== "lieu") return;
    const search = String(interaction.options.getFocused(true).value).toLowerCase();
    const places = await listPlaces(interaction.guildId!);
    const filtered = places
      .filter((p) => p.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((p) => ({ name: p.name, value: p.id }));
    await interaction.respond(filtered);
  },
};
