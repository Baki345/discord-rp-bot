import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { toggleOnDuty, ServiceError } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

async function toggle(interaction: ChatInputCommandInteraction, onDuty: boolean) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const membership = await toggleOnDuty(actor, { guildId: actor.guildId, characterId: character.id, onDuty });
    await interaction.reply({
      content: onDuty ? `🟢 En service — **${membership.job.name}**.` : `🔴 Fin de service — **${membership.job.name}**.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "FORBIDDEN" || e.code === "NOT_FOUND")) {
      await interaction.reply({ content: e.message || "Tu n'as pas de métier.", ephemeral: true });
      return;
    }
    throw e;
  }
}

export const serviceCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("service")
    .setDescription("Prendre ou quitter ton service (métier)")
    .addSubcommand((sub) => sub.setName("prise-de-service").setDescription("Prendre ton service"))
    .addSubcommand((sub) => sub.setName("fin-de-service").setDescription("Terminer ton service")),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "prise-de-service") return toggle(interaction, true);
    if (sub === "fin-de-service") return toggle(interaction, false);
  },
};
