import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { ExamSession } from "./examSessions.js";

const LETTERS = ["A", "B", "C", "D"];

export function renderQuestion(session: ExamSession) {
  const question = session.questions[session.currentIndex];
  if (!question) throw new Error("renderQuestion called past the last question");

  const embed = new EmbedBuilder()
    .setTitle(`📋 Examen — ${session.licenseName}`)
    .setColor(0x7c3aed)
    .setDescription(`Question ${session.currentIndex + 1}/${session.questions.length}\n\n**${question.question}**`)
    .addFields(question.choices.map((choice, i) => ({ name: LETTERS[i] ?? String(i), value: choice, inline: true })));

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    question.choices.map((_, i) =>
      new ButtonBuilder()
        .setCustomId(`permis:answer:${i}`)
        .setLabel(LETTERS[i] ?? String(i))
        .setStyle(ButtonStyle.Primary),
    ),
  );

  return { embeds: [embed], components: [row] };
}
