import type { ChatInputCommandInteraction } from "discord.js";
import { addExtraOwner, addTrustedAdmin, removeStaff, listStaff } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

const TIER_LABELS: Record<string, string> = {
  EXTRA_OWNER: "👑 Extra owner",
  TRUSTED_ADMIN: "🛡️ Trusted admin",
};

export async function executeStaffExtraOwner(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("membre", true);
  const actor = await resolveActorContext(interaction);
  await addExtraOwner(actor, { guildId: actor.guildId, discordUserId: target.id });
  await interaction.reply({ content: `👑 **${target.tag}** est maintenant extra owner.`, ephemeral: true });
}

export async function executeStaffTrustedAdmin(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("membre", true);
  const actor = await resolveActorContext(interaction);
  await addTrustedAdmin(actor, { guildId: actor.guildId, discordUserId: target.id });
  await interaction.reply({ content: `🛡️ **${target.tag}** est maintenant trusted admin.`, ephemeral: true });
}

export async function executeStaffRetirer(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("membre", true);
  const actor = await resolveActorContext(interaction);
  await removeStaff(actor, { guildId: actor.guildId, discordUserId: target.id });
  await interaction.reply({ content: `✅ **${target.tag}** n'a plus de rôle de staff sécurité.`, ephemeral: true });
}

export async function executeStaffListe(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const staff = await listStaff(actor.guildId);
  const ownerLine = `👑 <@${(await interaction.guild!.fetchOwner()).id}> — Propriétaire (toujours immunisé)`;
  const lines = staff.map((s) => `${TIER_LABELS[s.tier] ?? s.tier} — <@${s.discordUserId}>`);

  await interaction.reply({
    content: `**Hiérarchie de sécurité**\n${ownerLine}\n${lines.length > 0 ? lines.join("\n") : "_Aucun staff supplémentaire._"}`,
    ephemeral: true,
  });
}
