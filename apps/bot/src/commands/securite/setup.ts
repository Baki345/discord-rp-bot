import type { ChatInputCommandInteraction } from "discord.js";
import { setLogRoute, setMainChannel, getStaticConfig, setPartnershipChannel } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { setupQuarantineRole } from "../../security/quarantine.js";

export async function executeSecuriteSetup(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const actor = await resolveActorContext(interaction);
  const logsChannel = interaction.options.getChannel("salon_logs") ?? interaction.channel;
  const mainChannel = interaction.options.getChannel("salon_principal") ?? interaction.channel;

  const roleId = await setupQuarantineRole(actor, interaction.guild!);

  if (logsChannel) {
    await setLogRoute(actor, { guildId: actor.guildId, category: "GENERAL", channelId: logsChannel.id });
  }
  if (mainChannel) {
    await setMainChannel(actor, { guildId: actor.guildId, channelId: mainChannel.id });
  }

  await interaction.editReply(
    `✅ **Assistant de sécurité terminé**\n` +
      `🔒 Rôle de quarantaine : <@&${roleId}>\n` +
      `📋 Logs généraux : ${logsChannel ?? "non défini"}\n` +
      `🏠 Salon principal : ${mainChannel ?? "non défini"}\n\n` +
      `Prochaines étapes suggérées : \`/securite anti-nuke setup\`, \`/securite automod setup\`, \`/securite verification setup\`.`,
  );
}

export async function executeSalonsPartenariat(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("salon", true);
  const retirer = interaction.options.getBoolean("retirer") ?? false;
  const actor = await resolveActorContext(interaction);

  await setPartnershipChannel(actor, { guildId: actor.guildId, channelId: channel.id, add: !retirer });
  await interaction.reply({
    content: retirer ? `✅ ${channel} retiré des salons partenariat.` : `✅ ${channel} ajouté aux salons partenariat (auto-modération désactivée là-bas).`,
    ephemeral: true,
  });
}

export async function executeSalonsPartenariatListe(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const config = await getStaticConfig(actor.guildId);
  if (config.partnershipChannelIds.length === 0) {
    await interaction.reply({ content: "ℹ️ Aucun salon partenariat configuré.", ephemeral: true });
    return;
  }
  await interaction.reply({ content: `📋 Salons partenariat : ${config.partnershipChannelIds.map((id) => `<#${id}>`).join(", ")}`, ephemeral: true });
}
