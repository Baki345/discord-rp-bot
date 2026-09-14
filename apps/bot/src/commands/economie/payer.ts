import type { ChatInputCommandInteraction } from "discord.js";
import { transferMoney, getActiveCharacter, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executePayer(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const targetUser = interaction.options.getUser("joueur", true);
  const amount = interaction.options.getNumber("montant", true);
  const reason = interaction.options.getString("raison") ?? undefined;

  if (targetUser.id === interaction.user.id) {
    await interaction.reply({ content: "Tu ne peux pas te payer toi-même.", ephemeral: true });
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
    await transferMoney(actor, {
      guildId: actor.guildId,
      fromCharacterId: fromCharacter.id,
      toCharacterId: toCharacter.id,
      amountCents: Math.round(amount * 100),
      via: "cash",
      reason,
    });
    await interaction.reply({
      content: `✅ Tu as payé **${formatCents(Math.round(amount * 100))}** à **${toCharacter.firstName} ${toCharacter.lastName}**.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "INSUFFICIENT_CASH") {
      await interaction.reply({ content: "Tu n'as pas assez de liquide sur toi.", ephemeral: true });
      return;
    }
    throw e;
  }
}
