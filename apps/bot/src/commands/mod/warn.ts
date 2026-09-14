import type { ChatInputCommandInteraction } from "discord.js";
import { recordWarn, getWarnPoints } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeWarn(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("membre", true);
  const points = interaction.options.getInteger("points") ?? 1;
  const raison = interaction.options.getString("raison") ?? undefined;

  const actor = await resolveActorContext(interaction);
  await recordWarn(actor, { guildId: actor.guildId, targetDiscordId: target.id, points, reason: raison });
  const totalPoints = await getWarnPoints(actor.guildId, target.id);

  await interaction.reply({
    content: `⚠️ **${target.tag}** a reçu un avertissement (${points} pt${points > 1 ? "s" : ""})${raison ? ` — ${raison}` : ""}. Total cumulé : **${totalPoints}** pt(s).`,
    ephemeral: true,
  });
}
