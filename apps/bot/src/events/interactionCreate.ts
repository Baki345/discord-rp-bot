import { Events, type Interaction, type RepliableInteraction } from "discord.js";
import { ServiceError } from "@discord-rp/core";
import { prisma } from "@discord-rp/database";
import type { BotClient } from "../client.js";

async function replyOrFollowUp(interaction: RepliableInteraction, content: string) {
  const payload = { content, ephemeral: true };
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload).catch(() => {});
  } else {
    await interaction.reply(payload).catch(() => {});
  }
}

export function registerInteractionCreateEvent(client: BotClient) {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      if (interaction.inGuild()) {
        const guild = await prisma.guild.findUnique({ where: { id: interaction.guildId }, select: { isBlacklisted: true } });
        if (guild?.isBlacklisted) {
          if (interaction.isAutocomplete()) {
            await interaction.respond([]).catch(() => {});
          } else if (interaction.isRepliable()) {
            await replyOrFollowUp(interaction, "❌ Ce serveur a été suspendu par l'opérateur du bot.");
          }
          return;
        }
      }

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          console.warn(`Commande inconnue reçue : ${interaction.commandName}`);
          return;
        }
        await command.execute(interaction);
        return;
      }

      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        await command?.autocomplete?.(interaction);
        return;
      }

      if (interaction.isUserContextMenuCommand()) {
        const command = client.contextMenuCommands.get(interaction.commandName);
        if (!command) {
          console.warn(`Commande contextuelle inconnue reçue : ${interaction.commandName}`);
          return;
        }
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        const handler = client.buttonHandlers.find((h) => interaction.customId.startsWith(h.customIdPrefix));
        if (!handler) return;
        await handler.execute(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        const handler = client.modalHandlers.find((h) => interaction.customId.startsWith(h.customIdPrefix));
        if (!handler) return;
        await handler.execute(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const handler = client.selectMenuHandlers.find((h) => interaction.customId.startsWith(h.customIdPrefix));
        if (!handler) return;
        await handler.execute(interaction);
        return;
      }
    } catch (e) {
      const message = e instanceof ServiceError ? e.message : "Une erreur est survenue.";
      console.error("Erreur d'interaction (type", interaction.type, ")", e);
      if (interaction.isRepliable()) {
        await replyOrFollowUp(interaction, `❌ ${message}`);
      }
    }
  });
}
