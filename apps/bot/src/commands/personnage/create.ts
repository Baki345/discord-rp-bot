import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, type ChatInputCommandInteraction } from "discord.js";

export const CREATE_MODAL_ID = "personnage:create:modal";

export async function executeCreate(interaction: ChatInputCommandInteraction) {
  const modal = new ModalBuilder().setCustomId(CREATE_MODAL_ID).setTitle("Créer un personnage");

  const firstName = new TextInputBuilder()
    .setCustomId("firstName")
    .setLabel("Prénom")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(32)
    .setRequired(true);
  const lastName = new TextInputBuilder()
    .setCustomId("lastName")
    .setLabel("Nom")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(32)
    .setRequired(true);
  const dateOfBirth = new TextInputBuilder()
    .setCustomId("dateOfBirth")
    .setLabel("Date de naissance (JJ/MM/AAAA)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);
  const gender = new TextInputBuilder().setCustomId("gender").setLabel("Genre").setStyle(TextInputStyle.Short).setRequired(false);
  const nationality = new TextInputBuilder()
    .setCustomId("nationality")
    .setLabel("Nationalité")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(firstName),
    new ActionRowBuilder<TextInputBuilder>().addComponents(lastName),
    new ActionRowBuilder<TextInputBuilder>().addComponents(dateOfBirth),
    new ActionRowBuilder<TextInputBuilder>().addComponents(gender),
    new ActionRowBuilder<TextInputBuilder>().addComponents(nationality),
  );

  await interaction.showModal(modal);
}
