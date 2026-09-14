import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listApplicationCategories, getApplicationCategory, submitApplication } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { postApplicationForReview } from "../../applications/applicationReview.js";

const DM_TIMEOUT_MS = 5 * 60 * 1000;

async function executeCandidature(interaction: ChatInputCommandInteraction) {
  const categoryId = interaction.options.getString("categorie", true);
  const category = await getApplicationCategory(categoryId).catch(() => null);
  if (!category || category.guildId !== interaction.guildId) {
    await interaction.reply({ content: "❌ Catégorie introuvable.", ephemeral: true });
    return;
  }

  const questions = Array.isArray(category.questions) ? (category.questions as { id: string; label: string; required?: boolean }[]) : [];
  if (questions.length === 0) {
    await interaction.reply({ content: "❌ Cette catégorie n'a aucune question configurée.", ephemeral: true });
    return;
  }

  await interaction.reply({ content: "📨 Je t'envoie les questions en message privé — vérifie que tes DMs sont ouverts.", ephemeral: true });

  const dm = await interaction.user.createDM().catch(() => null);
  if (!dm) {
    await interaction.followUp({ content: "❌ Impossible de t'envoyer un message privé. Ouvre tes DMs et réessaie.", ephemeral: true });
    return;
  }

  await dm.send(`📋 **Candidature — ${category.name}**\nRéponds à chaque question ci-dessous. Tu as 5 minutes par question.`);

  const answers: Record<string, string> = {};
  for (const q of questions) {
    await dm.send(`**${q.label}**${q.required ? " *(obligatoire)*" : " *(optionnel — réponds \"-\" pour passer)*"}`);
    const collected = await dm
      .awaitMessages({ filter: (m) => m.author.id === interaction.user.id, max: 1, time: DM_TIMEOUT_MS, errors: ["time"] })
      .catch(() => null);
    if (!collected) {
      await dm.send("⏱️ Temps écoulé — candidature annulée. Relance `/candidature` pour recommencer.");
      return;
    }
    const answer = collected.first()!.content.trim();
    answers[q.id] = answer === "-" ? "" : answer;
  }

  const actor = await resolveActorContext(interaction);
  const application = await submitApplication(actor, { guildId: interaction.guildId!, categoryId, answers });

  await dm.send("✅ Candidature envoyée ! Tu seras notifié·e de la décision.");
  await postApplicationForReview(interaction.guild!, category, application, questions);
}

export const candidatureCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("candidature")
    .setDescription("Postuler à une catégorie de candidature (modérateur, partenaire, etc.)")
    .addStringOption((opt) => opt.setName("categorie").setDescription("La catégorie").setRequired(true).setAutocomplete(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    return executeCandidature(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    const search = String(interaction.options.getFocused()).toLowerCase();
    const categories = await listApplicationCategories(interaction.guildId!);
    const filtered = categories
      .filter((c) => c.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((c) => ({ name: c.name, value: c.id }));
    await interaction.respond(filtered);
  },
};
