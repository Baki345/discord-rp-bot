import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { INTERACTION_ACTIONS, isInteractionAction, recordInteractionGiven, recordInteractionReceived, getInteractionStats } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { fetchReactionGif } from "../../interactions/nekosGif.js";

const ACTION_LABELS: Record<string, string> = {
  calin: "câline",
  bisou: "embrasse",
  tape: "tape",
  caresse: "caresse",
  cajole: "cajole",
  chatouille: "chatouille",
  pousse: "pousse du coude",
  "tape-m-cinq": "tape m'en cinq avec",
};

/**
 * Builds the message payload and records the stats side effect — returns
 * the payload rather than sending it itself, since the slash command
 * (fresh reply) and the "Renvoyer" button (reply after an update()) need
 * to deliver it through different interaction methods.
 */
export async function buildInteractionPayload(guildId: string, action: string, giverId: string, receiverId: string) {
  const endpoint = INTERACTION_ACTIONS[action as keyof typeof INTERACTION_ACTIONS];
  const gifUrl = await fetchReactionGif(endpoint);

  await recordInteractionGiven(guildId, giverId, action);
  await recordInteractionReceived(guildId, receiverId, action);

  const embed = new EmbedBuilder().setDescription(`<@${giverId}> ${ACTION_LABELS[action]} <@${receiverId}> !`).setColor(0x7c3aed);
  if (gifUrl) embed.setImage(gifUrl);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`interaction:renvoyer:${action}:${giverId}:${receiverId}`).setLabel("Renvoyer").setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: gifUrl ? [row] : [], gifMissing: !gifUrl };
}

async function executeFaire(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString("action", true);
  const cible = interaction.options.getUser("cible", true);

  if (!isInteractionAction(action)) {
    await interaction.reply({ content: "❌ Action inconnue.", ephemeral: true });
    return;
  }
  if (cible.id === interaction.user.id) {
    await interaction.reply({ content: "❌ Tu ne peux pas faire ça à toi-même.", ephemeral: true });
    return;
  }

  const payload = await buildInteractionPayload(interaction.guildId!, action, interaction.user.id, cible.id);
  await interaction.reply({ embeds: payload.embeds, components: payload.components });
  if (payload.gifMissing) await interaction.followUp({ content: "ℹ️ (le service de GIF est indisponible pour le moment)", ephemeral: true });
}

async function executeStats(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const target = interaction.options.getUser("membre") ?? interaction.user;

  const stats = await getInteractionStats(interaction.guildId!, target.id);
  if (stats.length === 0) {
    await interaction.editReply(`ℹ️ **${target.tag}** n'a encore aucune interaction enregistrée.`);
    return;
  }

  const lines = stats.map((s) => `**${ACTION_LABELS[s.action] ?? s.action}** — donné(e) ${s.countGiven}× / reçu(e) ${s.countReceived}×`);
  await interaction.editReply(`📊 **Statistiques d'interaction de ${target.tag}**\n\n${lines.join("\n")}`);
}

export const interactionCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("interaction")
    .setDescription("Interactions roleplay (câlin, bisou, tape, ...)")
    .addSubcommand((sub) =>
      sub
        .setName("faire")
        .setDescription("Faire une interaction sur un membre")
        .addStringOption((opt) =>
          opt
            .setName("action")
            .setDescription("Le type d'interaction")
            .setRequired(true)
            .addChoices(Object.keys(INTERACTION_ACTIONS).map((key) => ({ name: ACTION_LABELS[key] ?? key, value: key }))),
        )
        .addUserOption((opt) => opt.setName("cible").setDescription("Le membre").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("stats")
        .setDescription("Voir les statistiques d'interaction d'un membre")
        .addUserOption((opt) => opt.setName("membre").setDescription("Le membre (par défaut : toi)").setRequired(false)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "faire") return executeFaire(interaction);
    if (sub === "stats") return executeStats(interaction);
  },
};
