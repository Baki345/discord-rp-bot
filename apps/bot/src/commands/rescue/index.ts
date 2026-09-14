import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { redeemRescueKey } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import type { BotCommand } from "../../client.js";

/**
 * Deliberately NOT permission-gated: the whole point of a rescue key is to
 * work even when the real owner's own account has no server role left.
 * Possession of the secret is the only authentication that matters here.
 */
export const rescueCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("rescue")
    .setDescription("Utiliser une clé de secours pour récupérer le statut extra owner")
    .addStringOption((opt) => opt.setName("cle").setDescription("La clé de secours").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const secret = interaction.options.getString("cle", true);
    const actor = await resolveActorContext(interaction);
    await redeemRescueKey(actor, { guildId: actor.guildId, secret });
    await interaction.reply({ content: "✅ Clé de secours valide — tu es maintenant extra owner de ce serveur.", ephemeral: true });
  },
};
