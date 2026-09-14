import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listVehicleModels, listOwnedVehicles, getActiveCharacter } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeAcheter } from "./acheter.js";
import { executeVendre } from "./vendre.js";
import { executeGarage } from "./garage.js";
import { executeInfo } from "./info.js";

export const vehiculeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("vehicule")
    .setDescription("Gérer les véhicules de ton personnage actif")
    .addSubcommand((sub) =>
      sub
        .setName("acheter")
        .setDescription("Acheter un véhicule")
        .addStringOption((opt) => opt.setName("modele").setDescription("Le modèle à acheter").setRequired(true).setAutocomplete(true))
        .addStringOption((opt) => opt.setName("plaque").setDescription("Plaque d'immatriculation").setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName("paiement")
            .setDescription("Moyen de paiement")
            .setRequired(true)
            .addChoices({ name: "Liquide", value: "cash" }, { name: "Banque", value: "bank" }),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("vendre")
        .setDescription("Vendre un de tes véhicules")
        .addStringOption((opt) => opt.setName("vehicule").setDescription("Un de tes véhicules").setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) => sub.setName("garage").setDescription("Voir tes véhicules"))
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Voir les détails d'un de tes véhicules")
        .addStringOption((opt) => opt.setName("vehicule").setDescription("Un de tes véhicules").setRequired(true).setAutocomplete(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "acheter") return executeAcheter(interaction);
    if (sub === "vendre") return executeVendre(interaction);
    if (sub === "garage") return executeGarage(interaction);
    if (sub === "info") return executeInfo(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    const focused = interaction.options.getFocused(true);
    const search = String(focused.value).toLowerCase();

    if (focused.name === "modele") {
      const models = await listVehicleModels(interaction.guildId!);
      const filtered = models
        .filter((m) => m.name.toLowerCase().includes(search))
        .slice(0, 25)
        .map((m) => ({ name: `${m.name} (${m.category.name}) — ${(m.priceCents / 100).toFixed(2)} $`, value: m.id }));
      await interaction.respond(filtered);
      return;
    }

    if (focused.name === "vehicule") {
      const character = await getActiveCharacter(interaction.guildId!, interaction.user.id);
      if (!character) return interaction.respond([]);
      const vehicles = await listOwnedVehicles(interaction.guildId!, character.id);
      const filtered = vehicles
        .filter((v) => v.plate.toLowerCase().includes(search) || v.model.name.toLowerCase().includes(search))
        .slice(0, 25)
        .map((v) => ({ name: `${v.model.name} — ${v.plate}`, value: v.id }));
      await interaction.respond(filtered);
    }
  },
};
