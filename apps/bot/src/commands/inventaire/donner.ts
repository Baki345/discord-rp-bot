import type { ChatInputCommandInteraction } from "discord.js";
import { transferItem, getActiveCharacter, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeDonner(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const targetUser = interaction.options.getUser("joueur", true);
  const itemId = interaction.options.getString("article", true);
  const quantity = interaction.options.getInteger("quantite", true);

  if (targetUser.id === interaction.user.id) {
    await interaction.reply({ content: "Tu ne peux pas te donner un objet à toi-même.", ephemeral: true });
    return;
  }

  const fromCharacter = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!fromCharacter) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  const toCharacter = await getActiveCharacter(actor.guildId, targetUser.id);
  if (!toCharacter) {
    await interaction.reply({ content: `${targetUser} n'a pas de personnage actif dans ce serveur.`, ephemeral: true });
    return;
  }

  try {
    await transferItem(actor, {
      guildId: actor.guildId,
      fromCharacterId: fromCharacter.id,
      toCharacterId: toCharacter.id,
      itemId,
      quantity,
    });
    await interaction.reply({
      content: `✅ Objet donné à **${toCharacter.firstName} ${toCharacter.lastName}**.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "VALIDATION_ERROR") {
      await interaction.reply({ content: e.message, ephemeral: true });
      return;
    }
    throw e;
  }
}
