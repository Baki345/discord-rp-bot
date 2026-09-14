import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { collectRacket, listCompanies, ServiceError } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

async function executeCollecter(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const companyId = interaction.options.getString("entreprise", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const result = await collectRacket(actor, { guildId: actor.guildId, characterId: character.id, companyId });
    await interaction.reply({ content: `💰 Racket collecté : **${formatCents(result.amountCents)}**.` });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "VALIDATION_ERROR") {
      await interaction.reply({ content: e.message, ephemeral: true });
      return;
    }
    throw e;
  }
}

export const racketCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("racket")
    .setDescription("Racketter les entreprises du serveur")
    .addSubcommand((sub) =>
      sub
        .setName("collecter")
        .setDescription("Collecter le racket d'une entreprise")
        .addStringOption((opt) => opt.setName("entreprise").setDescription("L'entreprise").setRequired(true).setAutocomplete(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "collecter") return executeCollecter(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    const search = String(interaction.options.getFocused()).toLowerCase();
    const companies = await listCompanies(interaction.guildId!);
    const filtered = companies
      .filter((c) => c.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((c) => ({ name: c.name, value: c.id }));
    await interaction.respond(filtered);
  },
};
