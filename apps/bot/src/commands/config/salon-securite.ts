import type { ChatInputCommandInteraction } from "discord.js";
import { setLogRoute, ServiceError } from "@discord-rp/core";
import type { LogCategory } from "@discord-rp/database";
import { resolveActorContext } from "../../context/resolveActorContext.js";

const LABELS: Record<LogCategory, string> = {
  GENERAL: "généraux",
  MODERATION: "de modération",
  APPEALS: "d'appels",
  AUTOMOD: "d'auto-modération",
  ANTI_NUKE: "anti-nuke",
  VERIFICATION: "de vérification",
  JOIN_GATE: "de porte d'entrée",
  JOIN_RAID: "de raid d'arrivées",
  PANIC: "de mode panique",
};

export async function executeSalonSecurite(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const category = interaction.options.getString("categorie", true) as LogCategory;
  const channel = interaction.options.getChannel("salon");

  try {
    await setLogRoute(actor, { guildId: actor.guildId, category, channelId: channel?.id ?? null });
    await interaction.reply({
      content: channel
        ? `✅ Les logs ${LABELS[category]} seront envoyés dans ${channel}.`
        : `✅ Le routage des logs ${LABELS[category]} a été retiré — ils tomberont dans le salon "généraux".`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu dois être administrateur du serveur pour ça.", ephemeral: true });
      return;
    }
    throw e;
  }
}
