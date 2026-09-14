import type { ChatInputCommandInteraction } from "discord.js";
import { recordWarn, recordTimeout, recordKick, recordBan, getWarnPoints, getWarnEscalationConfig, evaluateWarnEscalation, assertModerationAllowed } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeWarn(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("membre", true);
  const points = interaction.options.getInteger("points") ?? 1;
  const raison = interaction.options.getString("raison") ?? undefined;

  const actor = await resolveActorContext(interaction);
  await assertModerationAllowed(actor.guildId, actor.discordUserId, target.id);

  const previousTotal = await getWarnPoints(actor.guildId, target.id);
  const warnCase = await recordWarn(actor, { guildId: actor.guildId, targetDiscordId: target.id, points, reason: raison });
  const newTotal = previousTotal + points;

  let escalationNote = "";
  const escalationConfig = await getWarnEscalationConfig(actor.guildId);
  const threshold = evaluateWarnEscalation(escalationConfig, previousTotal, newTotal);
  if (threshold) {
    const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
    const escalationReason = `Escalade d'avertissements : ${newTotal} points`;
    try {
      if (threshold.action === "TIMEOUT" && member?.moderatable) {
        const minutes = threshold.timeoutMinutes ?? 60;
        await member.timeout(minutes * 60_000, escalationReason);
        await recordTimeout(actor, { guildId: actor.guildId, targetDiscordId: target.id, reason: escalationReason, durationMinutes: minutes });
        escalationNote = `\n⏫ Escalade automatique : timeout de ${minutes} min (seuil de ${threshold.points} pts atteint).`;
      } else if (threshold.action === "KICK" && member?.kickable) {
        await member.kick(escalationReason);
        await recordKick(actor, { guildId: actor.guildId, targetDiscordId: target.id, reason: escalationReason });
        escalationNote = `\n⏫ Escalade automatique : expulsion (seuil de ${threshold.points} pts atteint).`;
      } else if (threshold.action === "BAN") {
        await interaction.guild!.members.ban(target.id, { reason: escalationReason });
        await recordBan(actor, { guildId: actor.guildId, targetDiscordId: target.id, reason: escalationReason });
        escalationNote = `\n⏫ Escalade automatique : bannissement (seuil de ${threshold.points} pts atteint).`;
      }
    } catch (err) {
      console.error("[mod] failed to apply warn escalation:", err);
    }
  }

  await interaction.reply({
    content: `⚠️ **${target.tag}** a reçu un avertissement (${points} pt${points > 1 ? "s" : ""})${raison ? ` — ${raison}` : ""}. Total cumulé : **${newTotal}** pt(s).\nCas : \`${warnCase.id.slice(-8)}\`${escalationNote}`,
    ephemeral: true,
  });
}
