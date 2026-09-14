import type { ChatInputCommandInteraction } from "discord.js";
import { getQuarantineRoleId, resolveLogChannelId, getVerificationConfig, getAntiNukeConfig, getAutomodConfig, runSecurityDiagnostics } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeDiagnostic(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const actor = await resolveActorContext(interaction);
  const guild = interaction.guild!;

  const [quarantineRoleId, generalLogRouteChannelId, verificationConfig, antiNukeConfig, automodConfig] = await Promise.all([
    getQuarantineRoleId(actor.guildId),
    resolveLogChannelId(actor.guildId, "GENERAL"),
    getVerificationConfig(actor.guildId),
    getAntiNukeConfig(actor.guildId),
    getAutomodConfig(actor.guildId),
  ]);

  const botMember = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  const botRolePosition = botMember?.roles.highest.position ?? null;
  const quarantineRole = quarantineRoleId ? await guild.roles.fetch(quarantineRoleId).catch(() => null) : null;

  const checks = runSecurityDiagnostics({
    quarantineRoleId,
    generalLogRouteChannelId,
    verificationEnabled: verificationConfig.enabled,
    verifiedRoleId: verificationConfig.verifiedRoleId,
    antiNukeEnabled: antiNukeConfig.enabled,
    automodEnabled: automodConfig.enabled,
    botRolePosition,
    quarantineRolePosition: quarantineRole?.position ?? null,
  });

  const lines = checks.map((c) => `${c.ok ? "✅" : "⚠️"} ${c.label}${c.detail ? `\n> ${c.detail}` : ""}`);
  await interaction.editReply(`🩺 **Diagnostic de sécurité**\n\n${lines.join("\n")}`);
}
