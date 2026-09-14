import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listCharacters } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeCreate } from "./create.js";
import { executeDelete } from "./delete.js";
import { executeInfo } from "./info.js";
import { executeSwitch } from "./switch.js";
import { executeList } from "./list.js";

function addCharacterOption(builder: import("discord.js").SlashCommandSubcommandBuilder) {
  return builder.addStringOption((opt) =>
    opt.setName("personnage").setDescription("Un de tes personnages").setRequired(true).setAutocomplete(true),
  );
}

export const personnageCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("personnage")
    .setDescription("Gérer tes personnages RP")
    .addSubcommand((sub) => sub.setName("create").setDescription("Créer un nouveau personnage"))
    .addSubcommand((sub) => sub.setName("list").setDescription("Lister tes personnages"))
    .addSubcommand((sub) => addCharacterOption(sub.setName("info").setDescription("Voir la fiche d'un personnage")))
    .addSubcommand((sub) => addCharacterOption(sub.setName("switch").setDescription("Changer de personnage actif")))
    .addSubcommand((sub) => addCharacterOption(sub.setName("delete").setDescription("Supprimer un personnage"))),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "create") return executeCreate(interaction);
    if (sub === "list") return executeList(interaction);
    if (sub === "info") return executeInfo(interaction);
    if (sub === "switch") return executeSwitch(interaction);
    if (sub === "delete") return executeDelete(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    const focused = interaction.options.getFocused().toLowerCase();
    const characters = await listCharacters(interaction.guildId!, interaction.user.id);
    const filtered = characters
      .filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((c) => ({ name: `${c.firstName} ${c.lastName}${c.isActiveForUser ? " (actif)" : ""}`, value: c.id }));
    await interaction.respond(filtered);
  },
};
