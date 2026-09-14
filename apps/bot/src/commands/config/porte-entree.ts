import type { ChatInputCommandInteraction } from "discord.js";
import { setJoinGateFilter, ServiceError, type JoinGateAction, type JoinGateFilterName } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

async function apply(interaction: ChatInputCommandInteraction, filter: JoinGateFilterName, settings: Record<string, unknown> | null, label: string) {
  const actor = await resolveActorContext(interaction);
  try {
    await setJoinGateFilter(actor, { guildId: actor.guildId, filter, settings });
    await interaction.reply({
      content: settings ? `✅ Filtre "${label}" activé.` : `✅ Filtre "${label}" désactivé.`,
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

function getAction(interaction: ChatInputCommandInteraction): JoinGateAction {
  return interaction.options.getString("action", true) as JoinGateAction;
}

function isOff(interaction: ChatInputCommandInteraction): boolean {
  return interaction.options.getString("action") === "OFF";
}

export async function executePorteEntreeAvatar(interaction: ChatInputCommandInteraction) {
  if (isOff(interaction)) return apply(interaction, "noAvatar", null, "pas de photo de profil");
  await apply(interaction, "noAvatar", { enabled: true, action: getAction(interaction) }, "pas de photo de profil");
}

export async function executePorteEntreeAge(interaction: ChatInputCommandInteraction) {
  if (isOff(interaction)) return apply(interaction, "minAccountAge", null, "âge du compte");
  const minutes = interaction.options.getInteger("minutes", true);
  const dm = interaction.options.getBoolean("mp") ?? false;
  await apply(interaction, "minAccountAge", { enabled: true, action: getAction(interaction), minutes, dmMinimumAge: dm }, "âge du compte");
}

export async function executePorteEntreeBotVerifie(interaction: ChatInputCommandInteraction) {
  if (isOff(interaction)) return apply(interaction, "unverifiedBot", null, "bots non vérifiés");
  await apply(interaction, "unverifiedBot", { enabled: true, action: getAction(interaction) }, "bots non vérifiés");
}

export async function executePorteEntreeBotAjout(interaction: ChatInputCommandInteraction) {
  if (isOff(interaction)) return apply(interaction, "unauthorizedBotAdd", null, "ajout de bot non autorisé");
  const idsRaw = interaction.options.getString("ids_autorises") ?? "";
  const authorizedAdderIds = idsRaw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  await apply(interaction, "unauthorizedBotAdd", { enabled: true, action: getAction(interaction), authorizedAdderIds }, "ajout de bot non autorisé");
}

export async function executePorteEntreeInvitation(interaction: ChatInputCommandInteraction) {
  if (isOff(interaction)) return apply(interaction, "inviteInUsername", null, "invitation dans le pseudo");
  await apply(interaction, "inviteInUsername", { enabled: true, action: getAction(interaction) }, "invitation dans le pseudo");
}

export async function executePorteEntreeSuspect(interaction: ChatInputCommandInteraction) {
  if (isOff(interaction)) return apply(interaction, "suspiciousAccount", null, "compte suspect");
  await apply(interaction, "suspiciousAccount", { enabled: true, action: getAction(interaction) }, "compte suspect");
}

export async function executePorteEntreePseudo(interaction: ChatInputCommandInteraction) {
  if (isOff(interaction)) return apply(interaction, "nicknameBlacklist", null, "pseudo interdit");
  const patternsRaw = interaction.options.getString("motifs", true);
  const patterns = patternsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  await apply(interaction, "nicknameBlacklist", { enabled: true, action: getAction(interaction), patterns }, "pseudo interdit");
}
