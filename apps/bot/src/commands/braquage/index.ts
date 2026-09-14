import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listRobberyTargets } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeCibles } from "./cibles.js";
import { executeTenter } from "./tenter.js";

export const braquageCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("braquage")
    .setDescription("Braquages RP")
    .addSubcommand((sub) => sub.setName("cibles").setDescription("Lister les cibles de braquage"))
    .addSubcommand((sub) =>
      sub
        .setName("tenter")
        .setDescription("Tenter un braquage")
        .addStringOption((opt) => opt.setName("cible").setDescription("La cible").setRequired(true).setAutocomplete(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "cibles") return executeCibles(interaction);
    if (sub === "tenter") return executeTenter(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    if (interaction.options.getFocused(true).name !== "cible") return;
    const search = String(interaction.options.getFocused(true).value).toLowerCase();
    const targets = await listRobberyTargets(interaction.guildId!);
    const filtered = targets
      .filter((t) => t.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((t) => ({ name: t.name, value: t.id }));
    await interaction.respond(filtered);
  },
};
