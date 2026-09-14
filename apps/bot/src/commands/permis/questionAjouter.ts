import type { ChatInputCommandInteraction } from "discord.js";
import { addQuestion, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeQuestionAjouter(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const licenseId = interaction.options.getString("permis", true);
  const question = interaction.options.getString("question", true);
  const choiceA = interaction.options.getString("choix-a", true);
  const choiceB = interaction.options.getString("choix-b", true);
  const choiceC = interaction.options.getString("choix-c");
  const choiceD = interaction.options.getString("choix-d");
  const correctLetter = interaction.options.getString("bonne-reponse", true);

  const choices = [choiceA, choiceB, choiceC, choiceD].filter((c): c is string => Boolean(c));
  const correctIndex = { A: 0, B: 1, C: 2, D: 3 }[correctLetter.toUpperCase()];

  if (correctIndex === undefined || correctIndex >= choices.length) {
    await interaction.reply({ content: "La bonne réponse doit correspondre à l'un des choix fournis.", ephemeral: true });
    return;
  }

  try {
    await addQuestion(actor, { guildId: actor.guildId, licenseId, question, choices, correctIndex });
    await interaction.reply({ content: "✅ Question ajoutée.", ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "FORBIDDEN" || e.code === "NOT_FOUND" || e.code === "VALIDATION_ERROR")) {
      await interaction.reply({
        content: e.code === "FORBIDDEN" ? "Tu n'as pas la permission de gérer les permis." : e.message || "Permis introuvable.",
        ephemeral: true,
      });
      return;
    }
    throw e;
  }
}
