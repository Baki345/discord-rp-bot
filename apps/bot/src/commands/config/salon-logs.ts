import type { ChatInputCommandInteraction } from "discord.js";
import { setLogChannel, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

const LABELS: Record<string, string> = {
  audit: "journal d'audit",
  economy: "économie",
  moderation: "modération",
};

export async function executeSalonLogs(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const type = interaction.options.getString("type", true) as "audit" | "economy" | "moderation";
  const channel = interaction.options.getChannel("salon");

  try {
    await setLogChannel(actor, { guildId: actor.guildId, channel: type, channelId: channel?.id ?? null });
    await interaction.reply({
      content: channel
        ? `✅ Les logs "${LABELS[type]}" seront envoyés dans ${channel}.`
        : `✅ Les logs "${LABELS[type]}" sont désactivés.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu dois être administrateur du serveur pour ça.", ephemeral: true });
      return;
    }
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Lance d'abord `/config setup`.", ephemeral: true });
      return;
    }
    throw e;
  }
}
