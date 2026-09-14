import type { ChatInputCommandInteraction } from "discord.js";
import { setAutomodConfig, getAutomodConfig, ServiceError, type AutomodConfig } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

async function apply(interaction: ChatInputCommandInteraction, patch: Partial<AutomodConfig>) {
  const actor = await resolveActorContext(interaction);
  try {
    const updated = await setAutomodConfig(actor, { guildId: actor.guildId, config: patch });
    await interaction.reply({ content: `✅ Auto-modération mise à jour (${updated.enabled ? "activée" : "désactivée"}).`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu dois être administrateur du serveur pour ça.", ephemeral: true });
      return;
    }
    throw e;
  }
}

export async function executeAutomodSetup(interaction: ChatInputCommandInteraction) {
  const enabled = interaction.options.getBoolean("actif");
  const maxHeat = interaction.options.getInteger("chaleur_max");
  const decayPerSecond = interaction.options.getNumber("decroissance_par_seconde");
  const strikesBeforeCap = interaction.options.getInteger("strikes_avant_cap");
  const normalTimeoutMinutes = interaction.options.getInteger("timeout_normal_minutes");
  const capTimeoutMinutes = interaction.options.getInteger("timeout_cap_minutes");
  const resetHeatOnTimeout = interaction.options.getBoolean("reset_apres_timeout");

  const patch: Partial<AutomodConfig> = {};
  if (enabled !== null) patch.enabled = enabled;
  if (maxHeat !== null) patch.maxHeat = maxHeat;
  if (decayPerSecond !== null) patch.decayPerSecond = decayPerSecond;
  if (strikesBeforeCap !== null) patch.strikesBeforeCap = strikesBeforeCap;
  if (normalTimeoutMinutes !== null) patch.normalTimeoutMinutes = normalTimeoutMinutes;
  if (capTimeoutMinutes !== null) patch.capTimeoutMinutes = capTimeoutMinutes;
  if (resetHeatOnTimeout !== null) patch.resetHeatOnTimeout = resetHeatOnTimeout;

  if (Object.keys(patch).length === 0) {
    const actor = await resolveActorContext(interaction);
    const current = await getAutomodConfig(actor.guildId);
    await interaction.reply({ content: `\`\`\`json\n${JSON.stringify(current, null, 2)}\n\`\`\``, ephemeral: true });
    return;
  }
  await apply(interaction, patch);
}

export async function executeAutomodMotAjouter(interaction: ChatInputCommandInteraction) {
  const mot = interaction.options.getString("mot", true);
  const actor = await resolveActorContext(interaction);
  const current = await getAutomodConfig(actor.guildId);
  if (current.wordBlacklist.includes(mot)) {
    await interaction.reply({ content: "ℹ️ Déjà sur la liste noire.", ephemeral: true });
    return;
  }
  await apply(interaction, { wordBlacklist: [...current.wordBlacklist, mot] });
}

export async function executeAutomodMotRetirer(interaction: ChatInputCommandInteraction) {
  const mot = interaction.options.getString("mot", true);
  const actor = await resolveActorContext(interaction);
  const current = await getAutomodConfig(actor.guildId);
  await apply(interaction, { wordBlacklist: current.wordBlacklist.filter((w) => w !== mot) });
}

export async function executeAutomodDomaineAjouter(interaction: ChatInputCommandInteraction) {
  const domaine = interaction.options.getString("domaine", true).toLowerCase();
  const actor = await resolveActorContext(interaction);
  const current = await getAutomodConfig(actor.guildId);
  if (current.domainBlacklist.includes(domaine)) {
    await interaction.reply({ content: "ℹ️ Déjà sur la liste noire.", ephemeral: true });
    return;
  }
  await apply(interaction, { domainBlacklist: [...current.domainBlacklist, domaine] });
}

export async function executeAutomodDomaineRetirer(interaction: ChatInputCommandInteraction) {
  const domaine = interaction.options.getString("domaine", true).toLowerCase();
  const actor = await resolveActorContext(interaction);
  const current = await getAutomodConfig(actor.guildId);
  await apply(interaction, { domainBlacklist: current.domainBlacklist.filter((d) => d !== domaine) });
}
