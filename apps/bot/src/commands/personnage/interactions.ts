import type { ButtonHandler, ModalHandler } from "../../client.js";
import { createCharacter, deleteCharacter, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { CREATE_MODAL_ID } from "./create.js";
import { DELETE_CONFIRM_PREFIX } from "./delete.js";

/** "JJ/MM/AAAA" -> Date, or undefined if empty/unparseable — never throws, the field is optional. */
function parseFrenchDate(raw: string): Date | undefined {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (!match) return undefined;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export const personnageCreateModalHandler: ModalHandler = {
  customIdPrefix: CREATE_MODAL_ID,
  async execute(interaction) {
    const actor = await resolveActorContext(interaction);
    const firstName = interaction.fields.getTextInputValue("firstName");
    const lastName = interaction.fields.getTextInputValue("lastName");
    const dateOfBirthRaw = interaction.fields.getTextInputValue("dateOfBirth");
    const gender = interaction.fields.getTextInputValue("gender");
    const nationality = interaction.fields.getTextInputValue("nationality");

    try {
      const character = await createCharacter(actor, {
        guildId: actor.guildId,
        discordUserId: actor.discordUserId,
        firstName,
        lastName,
        dateOfBirth: dateOfBirthRaw ? parseFrenchDate(dateOfBirthRaw) : undefined,
        gender: gender || undefined,
        nationality: nationality || undefined,
      });
      await interaction.reply({
        content: `✅ **${character.firstName} ${character.lastName}** a rejoint le RP — c'est maintenant ton personnage actif.`,
        ephemeral: true,
      });
    } catch (e) {
      if (e instanceof ServiceError && e.code === "ALREADY_EXISTS") {
        await interaction.reply({ content: "Tu as déjà un personnage avec ce prénom et ce nom.", ephemeral: true });
        return;
      }
      if (e instanceof ServiceError && e.code === "QUOTA_EXCEEDED") {
        await interaction.reply({ content: `❌ ${e.message}`, ephemeral: true });
        return;
      }
      throw e;
    }
  },
};

export const personnageDeleteConfirmHandler: ButtonHandler = {
  customIdPrefix: DELETE_CONFIRM_PREFIX,
  async execute(interaction) {
    const actor = await resolveActorContext(interaction);
    const characterId = interaction.customId.slice(DELETE_CONFIRM_PREFIX.length);

    try {
      const character = await deleteCharacter(actor, { guildId: actor.guildId, characterId });
      await interaction.update({
        content: `🗑️ **${character.firstName} ${character.lastName}** a été supprimé.`,
        components: [],
      });
    } catch (e) {
      if (e instanceof ServiceError && e.code === "FORBIDDEN") {
        await interaction.update({ content: "Ce n'est pas ton personnage.", components: [] });
        return;
      }
      throw e;
    }
  },
};
