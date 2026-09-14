import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listJobs } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executePostuler } from "./postuler.js";
import { executeDemissionner } from "./demissionner.js";
import { executeInfo } from "./info.js";

export const metierCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("metier")
    .setDescription("Gérer le métier de ton personnage actif")
    .addSubcommand((sub) =>
      sub
        .setName("postuler")
        .setDescription("Rejoindre un métier")
        .addStringOption((opt) => opt.setName("metier").setDescription("Le métier à rejoindre").setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) => sub.setName("demissionner").setDescription("Quitter ton métier actuel"))
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Voir le métier actuel de ton personnage, ou les infos d'un métier du serveur")
        .addStringOption((opt) => opt.setName("metier").setDescription("Un métier du serveur").setRequired(false).setAutocomplete(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "postuler") return executePostuler(interaction);
    if (sub === "demissionner") return executeDemissionner(interaction);
    if (sub === "info") return executeInfo(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    const focused = interaction.options.getFocused().toLowerCase();
    const jobs = await listJobs(interaction.guildId!);
    const filtered = jobs
      .filter((j) => j.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((j) => ({ name: j.name, value: j.id }));
    await interaction.respond(filtered);
  },
};
