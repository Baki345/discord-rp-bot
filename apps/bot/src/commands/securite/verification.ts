import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { setVerificationConfig, getVerificationConfig, recordManualVerification, ServiceError, type VerificationConfig } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { grantVerifiedRole } from "../../verification/actions.js";

export async function executeVerificationSetup(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);

  const enabled = interaction.options.getBoolean("actif");
  const method = interaction.options.getString("mode") as VerificationConfig["method"] | null;
  const target = interaction.options.getString("cible") as VerificationConfig["target"] | null;
  const verifiedRole = interaction.options.getRole("role_verifie");
  const failAction = interaction.options.getString("action_echec") as VerificationConfig["failAction"] | null;
  const timeoutMinutes = interaction.options.getInteger("delai_minutes");
  const legacy = interaction.options.getBoolean("quarantaine_legacy");

  const patch: Partial<VerificationConfig> = {};
  if (enabled !== null) patch.enabled = enabled;
  if (method !== null) patch.method = method;
  if (target !== null) patch.target = target;
  if (verifiedRole !== null) patch.verifiedRoleId = verifiedRole.id;
  if (failAction !== null) patch.failAction = failAction;
  if (timeoutMinutes !== null) patch.timeoutMinutes = timeoutMinutes;
  if (legacy !== null) patch.legacyQuarantineOnJoin = legacy;

  try {
    if (Object.keys(patch).length === 0) {
      const current = await getVerificationConfig(actor.guildId);
      await interaction.reply({ content: `\`\`\`json\n${JSON.stringify(current, null, 2)}\n\`\`\``, ephemeral: true });
      return;
    }
    const updated = await setVerificationConfig(actor, { guildId: actor.guildId, config: patch });
    await interaction.reply({
      content: `✅ Vérification mise à jour : ${updated.enabled ? "activée" : "désactivée"}, mode ${updated.method}.`,
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

export async function executeVerificationPanneau(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const config = await getVerificationConfig(actor.guildId);
  if (!config.enabled || !config.verifiedRoleId) {
    await interaction.reply({ content: "❌ Configure d'abord la vérification avec `/securite verification setup`.", ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Vérification")
    .setDescription("Clique sur le bouton ci-dessous pour te vérifier et accéder au serveur.")
    .setColor(0x7c3aed);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("verify:start").setLabel("Vérifier").setStyle(ButtonStyle.Primary),
  );

  const channel = interaction.channel;
  if (!channel?.isSendable()) {
    await interaction.reply({ content: "❌ Impossible de poster dans ce salon.", ephemeral: true });
    return;
  }
  await channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: "✅ Panneau de vérification posté.", ephemeral: true });
}

export async function executeVerificationManuel(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("membre", true);
  const actor = await resolveActorContext(interaction);
  const config = await getVerificationConfig(actor.guildId);
  if (!config.verifiedRoleId) {
    await interaction.reply({ content: "❌ Aucun rôle de vérification configuré.", ephemeral: true });
    return;
  }

  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "❌ Ce membre n'est pas sur le serveur.", ephemeral: true });
    return;
  }

  const ok = await grantVerifiedRole(member, config.verifiedRoleId);
  if (!ok) {
    await interaction.reply({ content: "❌ Échec de l'attribution du rôle.", ephemeral: true });
    return;
  }

  await recordManualVerification(actor, { guildId: actor.guildId, targetDiscordId: target.id });
  await interaction.reply({ content: `✅ **${target.tag}** a été vérifié manuellement.`, ephemeral: true });
}
