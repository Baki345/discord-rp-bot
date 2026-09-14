import type { ChatInputCommandInteraction } from "discord.js";
import { createPlace, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeCreer(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const name = interaction.options.getString("nom", true);
  const category = interaction.options.getString("categorie") ?? undefined;
  const description = interaction.options.getString("description") ?? undefined;

  try {
    const place = await createPlace(actor, { guildId: actor.guildId, name, category, description });
    await interaction.reply({ content: `✅ Lieu **${place.name}** créé.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu n'as pas la permission de gérer les lieux.", ephemeral: true });
      return;
    }
    if (e instanceof ServiceError && (e.code === "ALREADY_EXISTS" || e.code === "QUOTA_EXCEEDED")) {
      await interaction.reply({ content: e.message || "Ce lieu existe déjà.", ephemeral: true });
      return;
    }
    throw e;
  }
}
