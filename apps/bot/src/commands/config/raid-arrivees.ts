import type { ChatInputCommandInteraction } from "discord.js";
import { setJoinRaidConfig, getJoinRaidConfig, ServiceError, type JoinRaidConfig } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeRaidArrivees(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);

  const enabled = interaction.options.getBoolean("actif");
  const windowSeconds = interaction.options.getInteger("fenetre_secondes");
  const minJoins = interaction.options.getInteger("min_arrivees");
  const target = interaction.options.getString("cible") as JoinRaidConfig["target"] | null;
  const action = interaction.options.getString("action") as JoinRaidConfig["action"] | null;
  const idSimilarity = interaction.options.getString("similarite_id") as JoinRaidConfig["idSimilarity"] | null;
  const accountAgeFlagMinutes = interaction.options.getInteger("age_min_compte");
  const noAvatarFlag = interaction.options.getBoolean("drapeau_avatar");
  const minFlagMatches = interaction.options.getInteger("min_correspondances");
  const alertRole = interaction.options.getRole("role_alerte");
  const subsequentWindowSeconds = interaction.options.getInteger("fenetre_suivante_secondes");
  const autoLockdownOnTrigger = interaction.options.getBoolean("verrouillage_auto");

  const patch: Partial<JoinRaidConfig> = {};
  if (enabled !== null) patch.enabled = enabled;
  if (windowSeconds !== null) patch.windowSeconds = windowSeconds;
  if (minJoins !== null) patch.minJoins = minJoins;
  if (target !== null) patch.target = target;
  if (action !== null) patch.action = action;
  if (idSimilarity !== null) patch.idSimilarity = idSimilarity;
  if (accountAgeFlagMinutes !== null) patch.accountAgeFlagMinutes = accountAgeFlagMinutes;
  if (noAvatarFlag !== null) patch.noAvatarFlag = noAvatarFlag;
  if (minFlagMatches !== null) patch.minFlagMatches = minFlagMatches;
  if (alertRole !== null) patch.alertRoleId = alertRole.id;
  if (subsequentWindowSeconds !== null) patch.subsequentWindowSeconds = subsequentWindowSeconds;
  if (autoLockdownOnTrigger !== null) patch.autoLockdownOnTrigger = autoLockdownOnTrigger;

  try {
    if (Object.keys(patch).length === 0) {
      const current = await getJoinRaidConfig(actor.guildId);
      await interaction.reply({ content: `\`\`\`json\n${JSON.stringify(current, null, 2)}\n\`\`\``, ephemeral: true });
      return;
    }

    const updated = await setJoinRaidConfig(actor, { guildId: actor.guildId, config: patch });
    await interaction.reply({
      content: `✅ Détection de raid d'arrivées mise à jour : ${updated.enabled ? "activée" : "désactivée"}, seuil ${updated.minJoins} arrivées / ${updated.windowSeconds}s.`,
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
