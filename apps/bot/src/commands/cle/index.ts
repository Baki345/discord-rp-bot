import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listOwnedVehicles, listPlaces, getActiveCharacter } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeVehiculeDonner } from "./vehiculeDonner.js";
import { executeVehiculeRetirer } from "./vehiculeRetirer.js";
import { executeLieuDonner } from "./lieuDonner.js";
import { executeLieuRetirer } from "./lieuRetirer.js";

export const cleCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("cle")
    .setDescription("Gérer les clés de tes véhicules et lieux")
    .addSubcommandGroup((group) =>
      group
        .setName("vehicule")
        .setDescription("Clés de véhicule")
        .addSubcommand((sub) =>
          sub
            .setName("donner")
            .setDescription("Donner une clé de l'un de tes véhicules")
            .addStringOption((opt) => opt.setName("vehicule").setDescription("Ton véhicule").setRequired(true).setAutocomplete(true))
            .addUserOption((opt) => opt.setName("joueur").setDescription("Le joueur qui reçoit la clé").setRequired(true)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("retirer")
            .setDescription("Retirer une clé de l'un de tes véhicules")
            .addStringOption((opt) => opt.setName("vehicule").setDescription("Ton véhicule").setRequired(true).setAutocomplete(true))
            .addUserOption((opt) => opt.setName("joueur").setDescription("Le joueur à qui retirer la clé").setRequired(true)),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("lieu")
        .setDescription("Clés de lieu")
        .addSubcommand((sub) =>
          sub
            .setName("donner")
            .setDescription("Donner une clé de l'un de tes lieux")
            .addStringOption((opt) => opt.setName("lieu").setDescription("Ton lieu").setRequired(true).setAutocomplete(true))
            .addUserOption((opt) => opt.setName("joueur").setDescription("Le joueur qui reçoit la clé").setRequired(true)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("retirer")
            .setDescription("Retirer une clé de l'un de tes lieux")
            .addStringOption((opt) => opt.setName("lieu").setDescription("Ton lieu").setRequired(true).setAutocomplete(true))
            .addUserOption((opt) => opt.setName("joueur").setDescription("Le joueur à qui retirer la clé").setRequired(true)),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    if (group === "vehicule" && sub === "donner") return executeVehiculeDonner(interaction);
    if (group === "vehicule" && sub === "retirer") return executeVehiculeRetirer(interaction);
    if (group === "lieu" && sub === "donner") return executeLieuDonner(interaction);
    if (group === "lieu" && sub === "retirer") return executeLieuRetirer(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    const focused = interaction.options.getFocused(true);
    const search = String(focused.value).toLowerCase();

    if (focused.name === "vehicule") {
      const character = await getActiveCharacter(interaction.guildId!, interaction.user.id);
      if (!character) return interaction.respond([]);
      const vehicles = await listOwnedVehicles(interaction.guildId!, character.id);
      const filtered = vehicles
        .filter((v) => v.plate.toLowerCase().includes(search) || v.model.name.toLowerCase().includes(search))
        .slice(0, 25)
        .map((v) => ({ name: `${v.model.name} — ${v.plate}`, value: v.id }));
      await interaction.respond(filtered);
      return;
    }

    if (focused.name === "lieu") {
      const places = await listPlaces(interaction.guildId!);
      const owned = places.filter((p) => p.ownerCharacter?.discordUserId === interaction.user.id);
      const filtered = owned
        .filter((p) => p.name.toLowerCase().includes(search))
        .slice(0, 25)
        .map((p) => ({ name: p.name, value: p.id }));
      await interaction.respond(filtered);
    }
  },
};
