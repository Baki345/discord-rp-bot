import type { ChatInputCommandInteraction } from "discord.js";
import { createBackup, listBackups, getBackup, deleteBackup, clearBackups, planRestore, recordRestore, ServiceError, GuildStructureSnapshot } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { captureGuildSnapshot, currentStructureIds, applyRestorePlan } from "../../security/backupSnapshot.js";

export async function executeBackupCreer(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const label = interaction.options.getString("nom") ?? undefined;
  const actor = await resolveActorContext(interaction);
  const snapshot = await captureGuildSnapshot(interaction.guild!);
  const backup = await createBackup(actor, { guildId: actor.guildId, label, snapshot });
  await interaction.editReply(`💾 Sauvegarde créée : \`${backup.id}\` (${snapshot.channels.length} salons, ${snapshot.roles.length} rôles).`);
}

export async function executeBackupListe(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const backups = await listBackups(actor.guildId);
  if (backups.length === 0) {
    await interaction.reply({ content: "ℹ️ Aucune sauvegarde pour l'instant.", ephemeral: true });
    return;
  }
  const lines = backups
    .slice(0, 15)
    .map((b) => `\`${b.id}\` — ${b.label ?? "sans nom"} — ${b.createdAt.toLocaleString("fr-FR")}`);
  await interaction.reply({ content: `💾 **Sauvegardes (${backups.length}) :**\n${lines.join("\n")}`, ephemeral: true });
}

export async function executeBackupCharger(interaction: ChatInputCommandInteraction) {
  const backupId = interaction.options.getString("id", true);
  await interaction.deferReply({ ephemeral: true });
  const actor = await resolveActorContext(interaction);

  let backup;
  try {
    backup = await getBackup(actor.guildId, backupId);
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.editReply("❌ Sauvegarde introuvable.");
      return;
    }
    throw e;
  }

  const snapshot = GuildStructureSnapshot.parse(backup.snapshot);
  const plan = planRestore(currentStructureIds(interaction.guild!), snapshot);
  await applyRestorePlan(interaction.guild!, plan);
  await recordRestore(actor, { guildId: actor.guildId, backupId: backup.id, plan });

  await interaction.editReply(
    `✅ Restauration depuis \`${backup.id}\` — ${plan.channelsToRecreate.length} salon(s) recréé(s), ${plan.channelsToDelete.length} supprimé(s), ${plan.rolesToRecreate.length} rôle(s) recréé(s), ${plan.rolesToDelete.length} supprimé(s).`,
  );
}

export async function executeBackupSupprimer(interaction: ChatInputCommandInteraction) {
  const backupId = interaction.options.getString("id", true);
  const actor = await resolveActorContext(interaction);
  try {
    await deleteBackup(actor, { guildId: actor.guildId, backupId });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "❌ Sauvegarde introuvable.", ephemeral: true });
      return;
    }
    throw e;
  }
  await interaction.reply({ content: "✅ Sauvegarde supprimée.", ephemeral: true });
}

export async function executeBackupEffacer(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const count = await clearBackups(actor, actor.guildId);
  await interaction.reply({ content: `✅ ${count} sauvegarde(s) supprimée(s).`, ephemeral: true });
}
