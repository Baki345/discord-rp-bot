import type { ChatInputCommandInteraction } from "discord.js";
import { getLicense, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { startExamSession, getExamSession, sessionKey } from "./examSessions.js";
import { renderQuestion } from "./renderQuestion.js";

export async function executePasser(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const licenseId = interaction.options.getString("permis", true);

  const character = await requireActiveCharacter(interaction.guildId!, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  const key = sessionKey(interaction.guildId!, interaction.user.id);
  if (getExamSession(key)) {
    await interaction.reply({ content: "Tu as déjà un examen en cours — termine-le d'abord.", ephemeral: true });
    return;
  }

  try {
    const license = await getLicense(interaction.guildId!, licenseId);
    if (license.questions.length === 0) {
      await interaction.reply({ content: "Ce permis n'a aucune question configurée pour l'instant.", ephemeral: true });
      return;
    }

    startExamSession(key, {
      licenseId: license.id,
      licenseName: license.name,
      characterId: character.id,
      questions: license.questions.map((q) => ({ id: q.id, question: q.question, choices: q.choices as string[] })),
      answers: [],
      currentIndex: 0,
    });

    const session = getExamSession(key)!;
    await interaction.reply({ ...renderQuestion(session), ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Ce permis n'existe pas.", ephemeral: true });
      return;
    }
    throw e;
  }
}
