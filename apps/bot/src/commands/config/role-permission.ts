import type { ChatInputCommandInteraction } from "discord.js";
import { assignRole, unassignRole, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeRolePermission(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const action = interaction.options.getString("action", true) as "attribuer" | "retirer";
  const user = interaction.options.getUser("joueur", true);
  const roleId = interaction.options.getString("role", true);

  try {
    if (action === "attribuer") {
      const assignment = await assignRole(actor, { guildId: actor.guildId, discordUserId: user.id, roleId });
      await interaction.reply({
        content: `✅ Rôle RP **${assignment.role.name}** attribué à ${user}.`,
        ephemeral: true,
      });
    } else {
      await unassignRole(actor, { guildId: actor.guildId, discordUserId: user.id, roleId });
      await interaction.reply({ content: `✅ Rôle RP retiré à ${user}.`, ephemeral: true });
    }
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu dois être administrateur du serveur pour ça.", ephemeral: true });
      return;
    }
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Ce rôle RP ou cette attribution est introuvable.", ephemeral: true });
      return;
    }
    throw e;
  }
}
