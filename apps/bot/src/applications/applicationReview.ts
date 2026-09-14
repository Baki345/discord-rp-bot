import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type ButtonInteraction, type Guild, type TextChannel } from "discord.js";
import { acceptApplication, rejectApplication } from "@discord-rp/core";
import type { Application, ApplicationCategory } from "@discord-rp/database";
import type { ButtonHandler } from "../client.js";
import { resolveActorContext } from "../context/resolveActorContext.js";

function buildReviewEmbed(category: ApplicationCategory, application: Application, questions: { id: string; label: string }[]) {
  const answers = application.answers as Record<string, string>;
  const embed = new EmbedBuilder()
    .setTitle(`Candidature — ${category.name}`)
    .setDescription(`De <@${application.applicantDiscordId}>`)
    .setColor(0x7c3aed)
    .setFooter({ text: `id: ${application.id}` });
  for (const q of questions) {
    embed.addFields({ name: q.label, value: answers[q.id]?.trim() || "—" });
  }
  return embed;
}

export async function postApplicationForReview(
  guild: Guild,
  category: ApplicationCategory,
  application: Application,
  questions: { id: string; label: string }[],
): Promise<void> {
  if (!category.resultChannelId) return;
  const channel = (await guild.channels.fetch(category.resultChannelId).catch(() => null)) as TextChannel | null;
  if (!channel) return;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`application:accept:${application.id}`).setLabel("Accepter").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`application:reject:${application.id}`).setLabel("Refuser").setStyle(ButtonStyle.Danger),
  );
  await channel.send({ embeds: [buildReviewEmbed(category, application, questions)], components: [row] });
}

async function resolveActorRoleIds(interaction: ButtonInteraction): Promise<string[]> {
  const member = await interaction.guild!.members.fetch(interaction.user.id);
  return member.roles.cache.filter((r) => r.id !== interaction.guild!.id).map((r) => r.id);
}

async function notifyApplicant(interaction: ButtonInteraction, applicantDiscordId: string, accepted: boolean): Promise<void> {
  const user = await interaction.client.users.fetch(applicantDiscordId).catch(() => null);
  await user
    ?.send(accepted ? "✅ Ta candidature a été acceptée !" : "❌ Ta candidature a été refusée.")
    .catch(() => {});
}

export const applicationAcceptHandler: ButtonHandler = {
  customIdPrefix: "application:accept:",
  async execute(interaction: ButtonInteraction) {
    const applicationId = interaction.customId.split(":")[2]!;
    const actor = await resolveActorContext(interaction);
    const roleIds = await resolveActorRoleIds(interaction);
    const application = await acceptApplication(actor, roleIds, applicationId);

    await interaction.update({ components: [] });
    await interaction.followUp(`✅ Candidature acceptée par <@${interaction.user.id}>.`);
    await notifyApplicant(interaction, application.applicantDiscordId, true);
  },
};

export const applicationRejectHandler: ButtonHandler = {
  customIdPrefix: "application:reject:",
  async execute(interaction: ButtonInteraction) {
    const applicationId = interaction.customId.split(":")[2]!;
    const actor = await resolveActorContext(interaction);
    const roleIds = await resolveActorRoleIds(interaction);
    const application = await rejectApplication(actor, roleIds, applicationId);

    await interaction.update({ components: [] });
    await interaction.followUp(`❌ Candidature refusée par <@${interaction.user.id}>.`);
    await notifyApplicant(interaction, application.applicantDiscordId, false);
  },
};

