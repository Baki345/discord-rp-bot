import type { ChatInputCommandInteraction } from "discord.js";
import { setAntiNukeConfig, getAntiNukeConfig, ServiceError, type AntiNukeConfig } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

async function apply(interaction: ChatInputCommandInteraction, patch: Partial<AntiNukeConfig>) {
  const actor = await resolveActorContext(interaction);
  try {
    const updated = await setAntiNukeConfig(actor, { guildId: actor.guildId, config: patch });
    await interaction.reply({ content: `✅ Anti-nuke mis à jour (${updated.enabled ? "activé" : "désactivé"}).`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu dois être administrateur du serveur pour ça.", ephemeral: true });
      return;
    }
    throw e;
  }
}

export async function executeAntiNukeSetup(interaction: ChatInputCommandInteraction) {
  const enabled = interaction.options.getBoolean("actif");
  const strictMode = interaction.options.getBoolean("mode_strict");
  const perMinuteThreshold = interaction.options.getInteger("seuil_par_minute");
  const perHourThreshold = interaction.options.getInteger("seuil_par_heure");
  const autoQuarantineOnBreach = interaction.options.getBoolean("quarantaine_auto");

  const patch: Partial<AntiNukeConfig> = {};
  if (enabled !== null) patch.enabled = enabled;
  if (strictMode !== null) patch.strictMode = strictMode;
  if (perMinuteThreshold !== null) patch.perMinuteThreshold = perMinuteThreshold;
  if (perHourThreshold !== null) patch.perHourThreshold = perHourThreshold;
  if (autoQuarantineOnBreach !== null) patch.autoQuarantineOnBreach = autoQuarantineOnBreach;

  if (Object.keys(patch).length === 0) {
    const actor = await resolveActorContext(interaction);
    const current = await getAntiNukeConfig(actor.guildId);
    await interaction.reply({ content: `\`\`\`json\n${JSON.stringify(current, null, 2)}\n\`\`\``, ephemeral: true });
    return;
  }
  await apply(interaction, patch);
}

export async function executeAntiNukeWhitelistUtilisateur(interaction: ChatInputCommandInteraction) {
  const membre = interaction.options.getUser("membre", true);
  const retirer = interaction.options.getBoolean("retirer") ?? false;
  const actor = await resolveActorContext(interaction);
  const current = await getAntiNukeConfig(actor.guildId);
  const next = retirer
    ? current.whitelistedDiscordIds.filter((id) => id !== membre.id)
    : current.whitelistedDiscordIds.includes(membre.id)
      ? current.whitelistedDiscordIds
      : [...current.whitelistedDiscordIds, membre.id];
  await apply(interaction, { whitelistedDiscordIds: next });
}

export async function executeAntiNukeWhitelistCategorie(interaction: ChatInputCommandInteraction) {
  const categorie = interaction.options.getChannel("categorie", true);
  const retirer = interaction.options.getBoolean("retirer") ?? false;
  const actor = await resolveActorContext(interaction);
  const current = await getAntiNukeConfig(actor.guildId);
  const next = retirer
    ? current.whitelistedCategoryIds.filter((id) => id !== categorie.id)
    : current.whitelistedCategoryIds.includes(categorie.id)
      ? current.whitelistedCategoryIds
      : [...current.whitelistedCategoryIds, categorie.id];
  await apply(interaction, { whitelistedCategoryIds: next });
}
