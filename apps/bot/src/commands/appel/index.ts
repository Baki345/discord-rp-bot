import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../../client.js";
import { executeAppel } from "../mod/appel.js";

/**
 * Deliberately NOT under /mod (which is ModerateMembers-gated) — appealing
 * a sanction has to be usable by the sanctioned member themselves, who is
 * by definition not a moderator.
 */
export const appelCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("appel")
    .setDescription("Faire appel d'une sanction reçue")
    .addStringOption((opt) => opt.setName("cas").setDescription("Identifiant du cas (les derniers caractères, vus dans /mes-sanctions)").setRequired(true))
    .addStringOption((opt) => opt.setName("message").setDescription("Explique pourquoi tu contestes cette sanction").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    return executeAppel(interaction);
  },
};
