import type { ChatInputCommandInteraction } from "discord.js";
import { createActivity, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeCreer(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const name = interaction.options.getString("nom", true);
  const key = interaction.options.getString("cle", true);
  const cooldown = interaction.options.getInteger("recharge") ?? undefined;
  const rewardMin = interaction.options.getNumber("recompense-min") ?? 0;
  const rewardMax = interaction.options.getNumber("recompense-max") ?? 0;

  try {
    const activity = await createActivity(actor, {
      guildId: actor.guildId,
      key,
      name,
      cooldownMinutes: cooldown,
      rewardCashMinCents: Math.round(rewardMin * 100),
      rewardCashMaxCents: Math.round(rewardMax * 100),
    });
    await interaction.reply({ content: `✅ Activité **${activity.name}** créée.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "FORBIDDEN" || e.code === "ALREADY_EXISTS" || e.code === "VALIDATION_ERROR")) {
      await interaction.reply({
        content: e.code === "FORBIDDEN" ? "Tu n'as pas la permission de gérer les activités." : e.message,
        ephemeral: true,
      });
      return;
    }
    throw e;
  }
}
