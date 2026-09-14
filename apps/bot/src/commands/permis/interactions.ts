import type { ButtonHandler } from "../../client.js";
import { gradeExam, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { getExamSession, endExamSession, sessionKey } from "./examSessions.js";
import { renderQuestion } from "./renderQuestion.js";

export const ANSWER_PREFIX = "permis:answer:";

export const permisAnswerHandler: ButtonHandler = {
  customIdPrefix: ANSWER_PREFIX,
  async execute(interaction) {
    if (!interaction.inGuild()) return;
    const key = sessionKey(interaction.guildId!, interaction.user.id);
    const session = getExamSession(key);
    if (!session) {
      await interaction.update({ content: "Cet examen a expiré — relance `/permis passer`.", embeds: [], components: [] });
      return;
    }

    const chosenIndex = Number(interaction.customId.slice(ANSWER_PREFIX.length));
    session.answers[session.currentIndex] = chosenIndex;
    session.currentIndex += 1;

    if (session.currentIndex < session.questions.length) {
      await interaction.update(renderQuestion(session));
      return;
    }

    // Last question answered — grade and end the session.
    const actor = await resolveActorContext(interaction);
    endExamSession(key);

    try {
      const result = await gradeExam(actor, {
        guildId: actor.guildId,
        characterId: session.characterId,
        licenseId: session.licenseId,
        answers: session.answers,
      });
      await interaction.update({
        content: result.passed
          ? `✅ Réussi ! **${result.correctCount}/${result.totalCount}** (${result.scorePct}%) — tu as obtenu le permis **${session.licenseName}**.`
          : `❌ Échoué — **${result.correctCount}/${result.totalCount}** (${result.scorePct}%). Retente /permis passer quand tu veux.`,
        embeds: [],
        components: [],
      });
    } catch (e) {
      if (e instanceof ServiceError) {
        await interaction.update({ content: `❌ ${e.message}`, embeds: [], components: [] });
        return;
      }
      throw e;
    }
  },
};
