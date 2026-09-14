import { PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { writeAuditLog } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { hasDiscordPermission } from "./permissions.js";

const INVISIBLE_CHARS = new RegExp("[\\u200B-\\u200F\\uFEFF]", "g");

/** Strips leading characters commonly used to "hoist" a name above everyone else in the member list, plus zero-width/invisible characters. */
function sanitizeNickname(name: string): string {
  const stripped = name
    .replace(/^[^a-zA-Z0-9]+/, "")
    .replace(INVISIBLE_CHARS, "")
    .trim();
  return stripped.length > 0 ? stripped.slice(0, 32) : "Membre";
}

export async function executePseudo(interaction: ChatInputCommandInteraction) {
  if (!hasDiscordPermission(interaction, PermissionFlagsBits.ManageNicknames)) {
    await interaction.reply({ content: "❌ Il te faut la permission Discord **Gérer les pseudos**.", ephemeral: true });
    return;
  }

  const target = interaction.options.getUser("membre", true);
  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "❌ Ce membre n'est pas sur le serveur.", ephemeral: true });
    return;
  }

  const oldName = member.displayName;
  const newName = sanitizeNickname(oldName);
  if (newName === oldName) {
    await interaction.reply({ content: `ℹ️ Le pseudo de **${target.tag}** est déjà propre.`, ephemeral: true });
    return;
  }

  if (!member.manageable) {
    await interaction.reply({ content: "❌ Impossible de modifier le pseudo de ce membre (rôle trop élevé ?).", ephemeral: true });
    return;
  }

  await member.setNickname(newName, "Nettoyage de pseudo (dehoist)");

  const actor = await resolveActorContext(interaction);
  await writeAuditLog({
    guildId: actor.guildId,
    actorType: "DISCORD_USER",
    actorDiscordId: actor.discordUserId,
    action: "moderation.sanitize_nickname",
    targetType: "DiscordMember",
    targetId: target.id,
    metadata: { oldName, newName },
  });

  await interaction.reply({ content: `✏️ Pseudo de **${target.tag}** changé : \`${oldName}\` → \`${newName}\`.`, ephemeral: true });
}
