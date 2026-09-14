import type { ChatInputCommandInteraction } from "discord.js";
import { submitAppeal, reviewAppeal, listPendingAppeals, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeAppel(interaction: ChatInputCommandInteraction) {
  const caseIdSuffix = interaction.options.getString("cas", true);
  const message = interaction.options.getString("message", true);
  const actor = await resolveActorContext(interaction);

  try {
    const { appeal } = await submitAppeal(actor, { guildId: actor.guildId, caseIdSuffix, message });
    await interaction.reply({ content: `✅ Appel envoyé (\`${appeal.id.slice(-8)}\`) — le staff va l'examiner.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError) {
      await interaction.reply({ content: `❌ ${e.message}`, ephemeral: true });
      return;
    }
    throw e;
  }
}

export async function executeAppelListe(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const pending = await listPendingAppeals(actor.guildId);
  if (pending.length === 0) {
    await interaction.reply({ content: "ℹ️ Aucun appel en attente.", ephemeral: true });
    return;
  }
  const lines = pending
    .slice(0, 10)
    .map((a) => `\`${a.id.slice(-8)}\` — <@${a.discordUserId}> sur le cas \`${a.caseId.slice(-8)}\` (${a.case.action})\n> ${a.message}`);
  await interaction.reply({ content: `📋 **Appels en attente (${pending.length}) :**\n\n${lines.join("\n")}`, ephemeral: true });
}

export async function executeAppelTraiter(interaction: ChatInputCommandInteraction) {
  const appealIdSuffix = interaction.options.getString("appel", true);
  const decision = interaction.options.getString("decision", true) as "accepter" | "rejeter";
  const actor = await resolveActorContext(interaction);

  const pending = await listPendingAppeals(actor.guildId);
  const matches = pending.filter((a) => a.id.endsWith(appealIdSuffix));
  if (matches.length === 0) {
    await interaction.reply({ content: "❌ Aucun appel en attente ne correspond à cet identifiant.", ephemeral: true });
    return;
  }
  if (matches.length > 1) {
    await interaction.reply({ content: "❌ Plusieurs appels correspondent — précise l'identifiant.", ephemeral: true });
    return;
  }
  const match = matches[0]!;

  const updated = await reviewAppeal(actor, { guildId: actor.guildId, appealId: match.id, accept: decision === "accepter" });
  await interaction.reply({
    content: `✅ Appel \`${updated.id.slice(-8)}\` ${decision === "accepter" ? "accepté" : "rejeté"}.`,
    ephemeral: true,
  });
}
