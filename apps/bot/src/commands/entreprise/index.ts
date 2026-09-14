import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction, type SlashCommandSubcommandBuilder } from "discord.js";
import { listCompanies } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeCreer } from "./creer.js";
import { executeEmployes } from "./employes.js";
import { executeEmbaucher } from "./embaucher.js";
import { executeLicencier } from "./licencier.js";
import { executeTreso } from "./treso.js";
import { executeFacadeBlanchiment } from "./facadeBlanchiment.js";
import { executeCoter } from "./coter.js";

function addCompanyOption(builder: SlashCommandSubcommandBuilder) {
  return builder.addStringOption((opt) =>
    opt.setName("entreprise").setDescription("Une entreprise du serveur").setRequired(true).setAutocomplete(true),
  );
}

export const entrepriseCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("entreprise")
    .setDescription("Gérer les entreprises du serveur")
    .addSubcommand((sub) =>
      sub
        .setName("creer")
        .setDescription("Créer une entreprise appartenant à ton personnage actif")
        .addStringOption((opt) => opt.setName("nom").setDescription("Nom de l'entreprise").setRequired(true))
        .addStringOption((opt) => opt.setName("description").setDescription("Description").setRequired(false)),
    )
    .addSubcommand((sub) => addCompanyOption(sub.setName("employes").setDescription("Lister les employés d'une entreprise")))
    .addSubcommand((sub) =>
      addCompanyOption(sub.setName("embaucher").setDescription("Embaucher un joueur"))
        .addUserOption((opt) => opt.setName("joueur").setDescription("Le joueur à embaucher").setRequired(true)),
    )
    .addSubcommand((sub) =>
      addCompanyOption(sub.setName("licencier").setDescription("Licencier un employé"))
        .addUserOption((opt) => opt.setName("joueur").setDescription("Le joueur à licencier").setRequired(true)),
    )
    .addSubcommand((sub) => addCompanyOption(sub.setName("treso").setDescription("Voir la trésorerie d'une entreprise")))
    .addSubcommand((sub) =>
      addCompanyOption(sub.setName("facade-blanchiment").setDescription("Activer/désactiver le blanchiment via cette entreprise (propriétaire)")).addBooleanOption(
        (opt) => opt.setName("actif").setDescription("Activer ou désactiver").setRequired(true),
      ),
    )
    .addSubcommand((sub) =>
      addCompanyOption(sub.setName("coter").setDescription("Coter cette entreprise en bourse (propriétaire)"))
        .addIntegerOption((opt) => opt.setName("actions").setDescription("Nombre total d'actions").setRequired(true).setMinValue(1))
        .addNumberOption((opt) => opt.setName("prix-initial").setDescription("Prix initial par action ($)").setRequired(true).setMinValue(0.01)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "creer") return executeCreer(interaction);
    if (sub === "employes") return executeEmployes(interaction);
    if (sub === "embaucher") return executeEmbaucher(interaction);
    if (sub === "licencier") return executeLicencier(interaction);
    if (sub === "treso") return executeTreso(interaction);
    if (sub === "facade-blanchiment") return executeFacadeBlanchiment(interaction);
    if (sub === "coter") return executeCoter(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    const focused = interaction.options.getFocused().toLowerCase();
    const companies = await listCompanies(interaction.guildId!);
    const filtered = companies
      .filter((c) => c.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((c) => ({ name: c.name, value: c.id }));
    await interaction.respond(filtered);
  },
};
