import type { ChatInputCommandInteraction } from "discord.js";
import { listActiveQuarantines, setJailChannelId, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { setupQuarantineRole, quarantineMember, releaseMember } from "../../security/quarantine.js";

export async function executeQuarantineSetup(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const actor = await resolveActorContext(interaction);
  const roleId = await setupQuarantineRole(actor, interaction.guild!);
  await interaction.editReply(`✅ Rôle de quarantaine prêt : <@&${roleId}>. Il sera appliqué automatiquement à tout nouveau salon.`);
}

export async function executeQuarantineMettre(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("membre", true);
  const raison = interaction.options.getString("raison") ?? undefined;

  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "❌ Ce membre n'est pas sur le serveur.", ephemeral: true });
    return;
  }

  const actor = await resolveActorContext(interaction);
  try {
    await quarantineMember(actor, member, raison);
  } catch (e) {
    if (e instanceof ServiceError && e.code === "ALREADY_EXISTS") {
      await interaction.reply({ content: "ℹ️ Ce membre est déjà en quarantaine.", ephemeral: true });
      return;
    }
    throw e;
  }

  await interaction.reply({ content: `🔒 **${target.tag}** est en quarantaine.${raison ? `\nRaison : ${raison}` : ""}`, ephemeral: true });
}

export async function executeQuarantineRetirer(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("membre", true);
  const raison = interaction.options.getString("raison") ?? undefined;

  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "❌ Ce membre n'est pas sur le serveur.", ephemeral: true });
    return;
  }

  const actor = await resolveActorContext(interaction);
  await releaseMember(actor, member, raison);

  await interaction.reply({ content: `✅ **${target.tag}** n'est plus en quarantaine — ses rôles précédents ont été restaurés.`, ephemeral: true });
}

export async function executeQuarantineListe(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const active = await listActiveQuarantines(actor.guildId);

  if (active.length === 0) {
    await interaction.reply({ content: "ℹ️ Aucun membre en quarantaine actuellement.", ephemeral: true });
    return;
  }

  const lines = active.map((q) => `<@${q.discordUserId}> — depuis <t:${Math.floor(q.quarantinedAt.getTime() / 1000)}:R>${q.reason ? ` (${q.reason})` : ""}`);
  await interaction.reply({ content: `🔒 **En quarantaine (${active.length}) :**\n${lines.join("\n")}`, ephemeral: true });
}

export async function executeQuarantineSalonJail(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const actor = await resolveActorContext(interaction);
  const salon = interaction.options.getChannel("salon");

  await setJailChannelId(actor, { guildId: interaction.guildId!, channelId: salon?.id ?? null });

  if (salon) {
    await interaction.editReply(
      `✅ <#${salon.id}> est maintenant le salon-jail — un membre en quarantaine y garde accès, tout le reste reste silencieux. Relance \`/securite quarantaine setup\` pour appliquer le changement immédiatement.`,
    );
  } else {
    await interaction.editReply("✅ Salon-jail désactivé — un membre en quarantaine perd désormais l'accès à tous les salons.");
  }
}
