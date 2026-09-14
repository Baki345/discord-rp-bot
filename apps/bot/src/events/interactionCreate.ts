import { Events, PermissionFlagsBits, type Interaction, type RepliableInteraction } from "discord.js";
import { ServiceError, evaluateCommandPermission, getCommandPermissionOverride } from "@discord-rp/core";
import { prisma } from "@discord-rp/database";
import type { BotClient } from "../client.js";
import { getLastInvokedAt, recordInvocation } from "../security/commandCooldownTracker.js";

function reasonMessage(reason: string, retryAfterSeconds?: number): string {
  switch (reason) {
    case "denied_role":
      return "❌ Ton rôle n'a pas le droit d'utiliser cette commande ici.";
    case "not_allowed_role":
      return "❌ Tu n'as pas le rôle requis pour utiliser cette commande.";
    case "wrong_channel":
      return "❌ Cette commande n'est pas utilisable dans ce salon.";
    case "cooldown":
      return `❌ Cette commande est en cooldown. Réessaie dans ${retryAfterSeconds}s.`;
    default:
      return "❌ Tu n'as pas le droit d'utiliser cette commande.";
  }
}

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

        if (interaction.inGuild() && interaction.guildId) {
          const override = await getCommandPermissionOverride(interaction.guildId, interaction.commandName);
          if (override) {
            const isDiscordGuildAdmin =
              interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
              interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
              false;
            const actorRoleIds = Array.isArray(interaction.member?.roles)
              ? interaction.member.roles
              : interaction.member?.roles.cache.map((r) => r.id) ?? [];
            const now = new Date();
            const result = evaluateCommandPermission(override, {
              actorRoleIds,
              channelId: interaction.channelId ?? "",
              isDiscordGuildAdmin,
              lastInvokedAt: getLastInvokedAt(interaction.guildId, interaction.commandName, interaction.user.id),
              now,
            });
            if (!result.allowed) {
              await replyOrFollowUp(interaction, reasonMessage(result.reason ?? "denied_role", result.retryAfterSeconds));
              return;
            }
            recordInvocation(interaction.guildId, interaction.commandName, interaction.user.id, now.getTime());
          }
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
