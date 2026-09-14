import type { ChatInputCommandInteraction } from "discord.js";
import { listCasesForMember } from "@discord-rp/core";

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

export async function executeHistorique(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("membre", true);
  const cases = await listCasesForMember(interaction.guildId!, target.id);

  if (cases.length === 0) {
    await interaction.reply({ content: `ℹ️ **${target.tag}** n'a aucun cas de modération.`, ephemeral: true });
    return;
  }

  const lines = cases.slice(0, 15).map((c) => {
    const label = ACTION_LABELS[c.action] ?? c.action;
    const when = `<t:${Math.floor(c.createdAt.getTime() / 1000)}:R>`;
    const by = `par <@${c.moderatorId}>`;
    const pts = c.points > 0 ? ` (${c.points} pt)` : "";
    return `\`${c.id.slice(-8)}\` ${label}${pts} — ${when} ${by}${c.reason ? `\n> ${c.reason}` : ""}`;
  });

  await interaction.reply({
    content: `📋 **Historique de ${target.tag}** (${cases.length} cas) :\n\n${lines.join("\n")}`,
    ephemeral: true,
  });
}
