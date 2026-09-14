import type { ChatInputCommandInteraction } from "discord.js";
import { setWarnEscalationConfig, getWarnEscalationConfig, ServiceError, type WarnEscalationThreshold } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeWarnEscalationActif(interaction: ChatInputCommandInteraction) {
  const actif = interaction.options.getBoolean("actif", true);
  const actor = await resolveActorContext(interaction);
  try {
    await setWarnEscalationConfig(actor, { guildId: actor.guildId, config: { enabled: actif } });
    await interaction.reply({ content: `✅ Escalade d'avertissements ${actif ? "activée" : "désactivée"}.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu dois être administrateur du serveur pour ça.", ephemeral: true });
      return;
    }
    throw e;
  }
}

export async function executeWarnEscalationAjouter(interaction: ChatInputCommandInteraction) {
  const points = interaction.options.getInteger("points", true);
  const action = interaction.options.getString("action", true) as WarnEscalationThreshold["action"];
  const timeoutMinutes = interaction.options.getInteger("timeout_minutes") ?? undefined;

  const actor = await resolveActorContext(interaction);
  const current = await getWarnEscalationConfig(actor.guildId);
  const thresholds = [...current.thresholds.filter((t) => t.points !== points), { points, action, timeoutMinutes }].sort((a, b) => a.points - b.points);

  try {
    await setWarnEscalationConfig(actor, { guildId: actor.guildId, config: { thresholds } });
    await interaction.reply({ content: `✅ Seuil ajouté : à ${points} pts → ${action}.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu dois être administrateur du serveur pour ça.", ephemeral: true });
      return;
    }
    throw e;
  }
}

export async function executeWarnEscalationRetirer(interaction: ChatInputCommandInteraction) {
  const points = interaction.options.getInteger("points", true);
  const actor = await resolveActorContext(interaction);
  const current = await getWarnEscalationConfig(actor.guildId);
  await setWarnEscalationConfig(actor, { guildId: actor.guildId, config: { thresholds: current.thresholds.filter((t) => t.points !== points) } });
  await interaction.reply({ content: `✅ Seuil à ${points} pts retiré.`, ephemeral: true });
}

export async function executeWarnEscalationListe(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const config = await getWarnEscalationConfig(actor.guildId);
  if (config.thresholds.length === 0) {
    await interaction.reply({ content: "ℹ️ Aucun seuil configuré.", ephemeral: true });
    return;
  }
  const lines = config.thresholds.map((t) => `${t.points} pts → ${t.action}${t.timeoutMinutes ? ` (${t.timeoutMinutes} min)` : ""}`);
  await interaction.reply({ content: `**Escalade (${config.enabled ? "activée" : "désactivée"}) :**\n${lines.join("\n")}`, ephemeral: true });
}
