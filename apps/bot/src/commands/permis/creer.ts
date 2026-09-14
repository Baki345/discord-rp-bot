import type { ChatInputCommandInteraction } from "discord.js";
import { createLicense, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeCreer(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const key = interaction.options.getString("cle", true);
  const name = interaction.options.getString("nom", true);
  const passScore = interaction.options.getInteger("seuil-reussite") ?? undefined;

  try {
    const license = await createLicense(actor, { guildId: actor.guildId, key, name, passScorePct: passScore });
    await interaction.reply({
      content: `✅ Permis **${license.name}** créé — ajoute des questions avec \`/permis question-ajouter\`.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "FORBIDDEN" || e.code === "ALREADY_EXISTS")) {
      await interaction.reply({
        content: e.code === "FORBIDDEN" ? "Tu n'as pas la permission de gérer les permis." : "Ce permis existe déjà.",
        ephemeral: true,
      });
      return;
    }
    throw e;
  }
}
