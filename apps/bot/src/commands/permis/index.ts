import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listLicenses } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeCreer } from "./creer.js";
import { executeQuestionAjouter } from "./questionAjouter.js";
import { executeListe } from "./liste.js";
import { executePasser } from "./passer.js";

export const permisCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("permis")
    .setDescription("Permis et examens RP")
    .addSubcommand((sub) =>
      sub
        .setName("creer")
        .setDescription("Créer un permis (staff)")
        .addStringOption((opt) => opt.setName("cle").setDescription("Identifiant (ex. conduite)").setRequired(true))
        .addStringOption((opt) => opt.setName("nom").setDescription("Nom affiché").setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName("seuil-reussite").setDescription("% de bonnes réponses pour réussir (défaut 80)").setRequired(false).setMinValue(1).setMaxValue(100),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("question-ajouter")
        .setDescription("Ajouter une question à un permis (staff)")
        .addStringOption((opt) => opt.setName("permis").setDescription("Le permis").setRequired(true).setAutocomplete(true))
        .addStringOption((opt) => opt.setName("question").setDescription("Texte de la question").setRequired(true))
        .addStringOption((opt) => opt.setName("choix-a").setDescription("Choix A").setRequired(true))
        .addStringOption((opt) => opt.setName("choix-b").setDescription("Choix B").setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName("bonne-reponse")
            .setDescription("La bonne réponse")
            .setRequired(true)
            .addChoices({ name: "A", value: "A" }, { name: "B", value: "B" }, { name: "C", value: "C" }, { name: "D", value: "D" }),
        )
        .addStringOption((opt) => opt.setName("choix-c").setDescription("Choix C (optionnel)").setRequired(false))
        .addStringOption((opt) => opt.setName("choix-d").setDescription("Choix D (optionnel)").setRequired(false)),
    )
    .addSubcommand((sub) => sub.setName("liste").setDescription("Lister les permis du serveur"))
    .addSubcommand((sub) =>
      sub
        .setName("passer")
        .setDescription("Passer l'examen d'un permis")
        .addStringOption((opt) => opt.setName("permis").setDescription("Le permis").setRequired(true).setAutocomplete(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "creer") return executeCreer(interaction);
    if (sub === "question-ajouter") return executeQuestionAjouter(interaction);
    if (sub === "liste") return executeListe(interaction);
    if (sub === "passer") return executePasser(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    if (interaction.options.getFocused(true).name !== "permis") return;
    const search = String(interaction.options.getFocused(true).value).toLowerCase();
    const licenses = await listLicenses(interaction.guildId!);
    const filtered = licenses
      .filter((l) => l.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((l) => ({ name: `${l.name} (${l.questions.length} question(s))`, value: l.id }));
    await interaction.respond(filtered);
  },
};
