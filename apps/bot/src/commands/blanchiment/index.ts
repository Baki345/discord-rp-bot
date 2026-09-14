import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { launderMoney, listCompanies, ServiceError } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

async function executeLaver(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const companyId = interaction.options.getString("entreprise", true);
  const amount = interaction.options.getNumber("montant", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const result = await launderMoney(actor, {
      guildId: actor.guildId,
      characterId: character.id,
      companyId,
      amountCents: Math.round(amount * 100),
    });
    await interaction.reply({
      content: `✅ **${formatCents(result.grossCents)}** blanchis — **${formatCents(result.netCents)}** déposés sur ton compte (frais : ${formatCents(result.feeCents)}).`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "VALIDATION_ERROR" || e.code === "INSUFFICIENT_CASH")) {
      await interaction.reply({ content: e.message || "Fonds insuffisants.", ephemeral: true });
      return;
    }
    throw e;
  }
}

export const blanchimentCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("blanchiment")
    .setDescription("Blanchir de l'argent via une façade")
    .addSubcommand((sub) =>
      sub
        .setName("laver")
        .setDescription("Blanchir du liquide via une entreprise-façade")
        .addStringOption((opt) => opt.setName("entreprise").setDescription("L'entreprise-façade").setRequired(true).setAutocomplete(true))
        .addNumberOption((opt) => opt.setName("montant").setDescription("Montant à blanchir ($)").setRequired(true).setMinValue(1)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "laver") return executeLaver(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    const search = String(interaction.options.getFocused()).toLowerCase();
    const companies = await listCompanies(interaction.guildId!);
    const filtered = companies
      .filter((c) => c.isLaunderingFront && c.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((c) => ({ name: c.name, value: c.id }));
    await interaction.respond(filtered);
  },
};
