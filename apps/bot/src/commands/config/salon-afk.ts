import type { ChatInputCommandInteraction } from "discord.js";
import { updateGuildConfig, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeSalonAfk(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const channel = interaction.options.getChannel("salon");
  const timeoutMinutes = interaction.options.getInteger("minutes");

  try {
    await updateGuildConfig(actor, {
      guildId: actor.guildId,
      afkChannelId: channel?.id ?? null,
      afkTimeoutMinutes: timeoutMinutes ?? undefined,
    });
    await interaction.reply({
      content: channel
        ? `✅ Salon anti-AFK défini sur ${channel}${timeoutMinutes ? ` (délai : ${timeoutMinutes} min)` : ""}.`
        : "✅ Anti-AFK désactivé.",
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
