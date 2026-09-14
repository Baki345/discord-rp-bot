import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listActivities } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeCreer } from "./creer.js";
import { executeListe } from "./liste.js";
import { executeTenter } from "./tenter.js";

export const activiteCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("activite")
    .setDescription("Activités RP (pêche, mine, livraisons...)")
    .addSubcommand((sub) =>
      sub
        .setName("creer")
        .setDescription("Créer une activité (staff)")
        .addStringOption((opt) => opt.setName("cle").setDescription("Identifiant (ex. peche)").setRequired(true))
        .addStringOption((opt) => opt.setName("nom").setDescription("Nom affiché").setRequired(true))
        .addIntegerOption((opt) => opt.setName("recharge").setDescription("Recharge en minutes").setRequired(false).setMinValue(1))
        .addNumberOption((opt) => opt.setName("recompense-min").setDescription("Récompense minimale ($)").setRequired(false).setMinValue(0))
        .addNumberOption((opt) => opt.setName("recompense-max").setDescription("Récompense maximale ($)").setRequired(false).setMinValue(0)),
    )
    .addSubcommand((sub) => sub.setName("liste").setDescription("Lister les activités du serveur"))
    .addSubcommand((sub) =>
      sub
        .setName("tenter")
        .setDescription("Tenter une activité")
        .addStringOption((opt) => opt.setName("activite").setDescription("L'activité").setRequired(true).setAutocomplete(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "creer") return executeCreer(interaction);
    if (sub === "liste") return executeListe(interaction);
    if (sub === "tenter") return executeTenter(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    if (interaction.options.getFocused(true).name !== "activite") return;
    const search = String(interaction.options.getFocused(true).value).toLowerCase();
    const activities = await listActivities(interaction.guildId!);
    const filtered = activities
      .filter((a) => a.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((a) => ({ name: a.name, value: a.id }));
    await interaction.respond(filtered);
  },
};
