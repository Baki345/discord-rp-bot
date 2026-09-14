import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listCasesForMember } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";

const ACTION_LABELS: Record<string, string> = {
  WARN: "⚠️ Avertissement",
  TIMEOUT: "⏱️ Timeout",
  UNTIMEOUT: "✅ Fin de timeout",
  KICK: "👢 Expulsion",
  BAN: "🔨 Bannissement",
  UNBAN: "✅ Fin de bannissement",
  QUARANTINE: "🔒 Quarantaine",
  UNQUARANTINE: "✅ Fin de quarantaine",
  LOCK: "🔐 Verrouillage",
  UNLOCK: "✅ Déverrouillage",
};

/** Self-service equivalent of /mod historique — visible to everyone, shows only the caller's own cases, so they have the case ID needed to use /appel. */
export const mesSanctionsCommand: BotCommand = {
  data: new SlashCommandBuilder().setName("mes-sanctions").setDescription("Voir tes propres sanctions (pour faire appel si besoin)"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return;
    const cases = await listCasesForMember(interaction.guildId!, interaction.user.id);
    if (cases.length === 0) {
      await interaction.reply({ content: "ℹ️ Tu n'as aucun cas de modération.", ephemeral: true });
      return;
    }
    const lines = cases.slice(0, 15).map((c) => {
      const label = ACTION_LABELS[c.action] ?? c.action;
      const when = `<t:${Math.floor(c.createdAt.getTime() / 1000)}:R>`;
      const pts = c.points > 0 ? ` (${c.points} pt)` : "";
      return `\`${c.id.slice(-8)}\` ${label}${pts} — ${when}${c.reason ? `\n> ${c.reason}` : ""}`;
    });
    await interaction.reply({
      content: `📋 **Tes sanctions (${cases.length}) :**\n\n${lines.join("\n")}\n\nUtilise \`/appel\` avec l'identifiant d'un cas pour contester.`,
      ephemeral: true,
    });
  },
};
