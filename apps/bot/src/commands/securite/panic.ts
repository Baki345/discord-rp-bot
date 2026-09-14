import type { ChatInputCommandInteraction } from "discord.js";
import { setPanicConfig, getPanicConfig, getPanicState, assertPanicAuthority, ServiceError, type PanicConfig } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { activatePanic, deactivatePanic } from "../../security/panicActions.js";

export async function executePanicSetup(interaction: ChatInputCommandInteraction) {
  const enabled = interaction.options.getBoolean("actif");
  const distinctActorsThreshold = interaction.options.getInteger("seuil_auteurs");
  const windowSeconds = interaction.options.getInteger("fenetre_secondes");
  const autoLockdownOnActivate = interaction.options.getBoolean("verrouillage_auto");
  const autoRestoreLatestBackup = interaction.options.getBoolean("restauration_auto");
  const alertRole = interaction.options.getRole("role_alerte");

  const patch: Partial<PanicConfig> = {};
  if (enabled !== null) patch.enabled = enabled;
  if (distinctActorsThreshold !== null) patch.distinctActorsThreshold = distinctActorsThreshold;
  if (windowSeconds !== null) patch.windowSeconds = windowSeconds;
  if (autoLockdownOnActivate !== null) patch.autoLockdownOnActivate = autoLockdownOnActivate;
  if (autoRestoreLatestBackup !== null) patch.autoRestoreLatestBackup = autoRestoreLatestBackup;
  if (alertRole !== null) patch.alertRoleId = alertRole.id;

  const actor = await resolveActorContext(interaction);
  if (Object.keys(patch).length === 0) {
    const current = await getPanicConfig(actor.guildId);
    await interaction.reply({ content: `\`\`\`json\n${JSON.stringify(current, null, 2)}\n\`\`\``, ephemeral: true });
    return;
  }

  try {
    const updated = await setPanicConfig(actor, { guildId: actor.guildId, config: patch });
    await interaction.reply({ content: `✅ Mode panique mis à jour (${updated.enabled ? "activé" : "désactivé"}).`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu dois être administrateur du serveur pour ça.", ephemeral: true });
      return;
    }
    throw e;
  }
}

export async function executePanicActiver(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  try {
    await assertPanicAuthority(actor.guildId, actor.discordUserId);
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "❌ " + e.message, ephemeral: true });
      return;
    }
    throw e;
  }

  await interaction.deferReply({ ephemeral: true });
  await activatePanic(interaction.guild!, [actor.discordUserId]);
  await interaction.editReply("🚨 Mode panique activé manuellement.");
}

export async function executePanicFin(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  try {
    await assertPanicAuthority(actor.guildId, actor.discordUserId);
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "❌ " + e.message, ephemeral: true });
      return;
    }
    throw e;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    await deactivatePanic(interaction.guild!);
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.editReply("ℹ️ Le mode panique n'est pas actif.");
      return;
    }
    throw e;
  }
  await interaction.editReply("✅ Mode panique levé.");
}

export async function executePanicStatut(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const state = await getPanicState(actor.guildId);
  if (!state.active) {
    await interaction.reply({ content: "✅ Mode panique inactif.", ephemeral: true });
    return;
  }
  await interaction.reply({
    content: `🚨 Mode panique actif depuis ${state.activatedAt} — ${state.respondingActorIds.length} auteur(s) responsable(s).`,
    ephemeral: true,
  });
}
