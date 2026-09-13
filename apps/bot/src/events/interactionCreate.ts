import { Events, type Interaction } from "discord.js";
import { ServiceError } from "@discord-rp/core";
import type { BotClient } from "../client.js";

/**
 * The single interaction router. For now this only dispatches chat-input
 * (slash) commands; button/select/modal routing (matched by customId
 * prefix against handlers each command category registers) is added
 * starting with /personnage in M3, which is the first category that needs
 * a creation modal.
 */
export function registerInteractionCreateEvent(client: BotClient) {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`Commande inconnue reçue : ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (e) {
      const message = e instanceof ServiceError ? e.message : "Une erreur est survenue.";
      console.error(`Erreur dans /${interaction.commandName}`, e);
      const payload = { content: `❌ ${message}`, ephemeral: true } as const;
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  });
}
