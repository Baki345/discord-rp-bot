import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction, type NonThreadGuildBasedChannel } from "discord.js";
import { startLockdown, endLockdown, getLockdownState, ServiceError, type LockdownState } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import type { BotCommand } from "../../client.js";
import { lockChannel, unlockChannel, isLockableChannel, stripDangerousRolePermissions, restoreRolePermissions, pauseInvites } from "../../security/lockdown.js";

export const lockdownCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("lockdown")
    .setDescription("Verrouillage d'urgence du serveur")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("salon")
        .setDescription("Verrouiller un salon (celui-ci par défaut)")
        .addChannelOption((opt) => opt.setName("salon").setDescription("Le salon à verrouiller"))
        .addBooleanOption((opt) => opt.setName("cache").setDescription("Mode aveugle : aussi cacher le salon")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("salons")
        .setDescription("Verrouiller plusieurs salons d'un coup")
        .addStringOption((opt) => opt.setName("salons").setDescription("Salons mentionnés (#salon1 #salon2 ...)").setRequired(true))
        .addBooleanOption((opt) => opt.setName("cache").setDescription("Mode aveugle : aussi cacher les salons")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("serveur")
        .setDescription("Verrouiller tout le serveur (salons + rôles + arrivées)")
        .addBooleanOption((opt) => opt.setName("cache").setDescription("Mode aveugle : aussi cacher les salons"))
        .addBooleanOption((opt) => opt.setName("kick_nouveaux").setDescription("Expulser automatiquement les nouveaux arrivants"))
        .addBooleanOption((opt) => opt.setName("ban_nouveaux").setDescription("Bannir automatiquement les nouveaux arrivants"))
        .addBooleanOption((opt) => opt.setName("pause_invitations").setDescription("Supprimer les invitations actives")),
    )
    .addSubcommand((sub) => sub.setName("fin").setDescription("Lever le verrouillage et tout restaurer"))
    .addSubcommand((sub) => sub.setName("statut").setDescription("Voir l'état actuel du verrouillage")),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "salon") return executeSalon(interaction);
    if (sub === "salons") return executeSalons(interaction);
    if (sub === "serveur") return executeServeur(interaction);
    if (sub === "fin") return executeFin(interaction);
    if (sub === "statut") return executeStatut(interaction);
  },
};

async function executeSalon(interaction: ChatInputCommandInteraction) {
  const channelOpt = interaction.options.getChannel("salon");
  const hidden = interaction.options.getBoolean("cache") ?? false;
  const channel = (channelOpt ?? interaction.channel) as NonThreadGuildBasedChannel | null;
  if (!channel || !isLockableChannel(channel)) {
    await interaction.reply({ content: "❌ Salon invalide.", ephemeral: true });
    return;
  }

  const actor = await resolveActorContext(interaction);
  const snapshot = lockChannel(channel, hidden);

  try {
    await startLockdown(actor, {
      guildId: actor.guildId,
      hidden,
      fullServer: false,
      lockedChannelIds: [channel.id],
      channelPriorOverwrites: { [channel.id]: snapshot },
      autoKickNewMembers: false,
      autoBanNewMembers: false,
      invitesPaused: false,
      strippedRolePermissions: {},
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "ALREADY_EXISTS") {
      await interaction.reply({ content: "❌ Un lockdown est déjà actif — utilise `/lockdown fin` d'abord.", ephemeral: true });
      return;
    }
    throw e;
  }

  await interaction.reply({ content: `🔐 ${channel} verrouillé${hidden ? " (caché)" : ""}.`, ephemeral: true });
}

async function executeSalons(interaction: ChatInputCommandInteraction) {
  const raw = interaction.options.getString("salons", true);
  const hidden = interaction.options.getBoolean("cache") ?? false;
  const ids = [...raw.matchAll(/\d{15,25}/g)].map((m) => m[0]);
  if (ids.length === 0) {
    await interaction.reply({ content: "❌ Aucun salon reconnu.", ephemeral: true });
    return;
  }

  const actor = await resolveActorContext(interaction);
  const channelPriorOverwrites: LockdownState["channelPriorOverwrites"] = {};
  const lockedChannelIds: string[] = [];

  for (const id of ids) {
    const channel = (await interaction.guild!.channels.fetch(id).catch(() => null)) as NonThreadGuildBasedChannel | null;
    if (!channel || !isLockableChannel(channel)) continue;
    channelPriorOverwrites[channel.id] = lockChannel(channel, hidden);
    lockedChannelIds.push(channel.id);
  }

  if (lockedChannelIds.length === 0) {
    await interaction.reply({ content: "❌ Aucun salon verrouillable trouvé.", ephemeral: true });
    return;
  }

  try {
    await startLockdown(actor, {
      guildId: actor.guildId,
      hidden,
      fullServer: false,
      lockedChannelIds,
      channelPriorOverwrites,
      autoKickNewMembers: false,
      autoBanNewMembers: false,
      invitesPaused: false,
      strippedRolePermissions: {},
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "ALREADY_EXISTS") {
      await interaction.reply({ content: "❌ Un lockdown est déjà actif — utilise `/lockdown fin` d'abord.", ephemeral: true });
      return;
    }
    throw e;
  }

  await interaction.reply({ content: `🔐 ${lockedChannelIds.length} salon(s) verrouillé(s).`, ephemeral: true });
}

async function executeServeur(interaction: ChatInputCommandInteraction) {
  const hidden = interaction.options.getBoolean("cache") ?? false;
  const autoKickNewMembers = interaction.options.getBoolean("kick_nouveaux") ?? false;
  const autoBanNewMembers = interaction.options.getBoolean("ban_nouveaux") ?? false;
  const pauseInvitesOpt = interaction.options.getBoolean("pause_invitations") ?? false;

  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild!;
  const actor = await resolveActorContext(interaction);

  const channels = await guild.channels.fetch();
  const channelPriorOverwrites: LockdownState["channelPriorOverwrites"] = {};
  const lockedChannelIds: string[] = [];
  for (const channel of channels.values()) {
    if (!channel || !isLockableChannel(channel)) continue;
    channelPriorOverwrites[channel.id] = lockChannel(channel, hidden);
    lockedChannelIds.push(channel.id);
  }

  const strippedRolePermissions = await stripDangerousRolePermissions(guild);
  if (pauseInvitesOpt) await pauseInvites(guild);

  try {
    await startLockdown(actor, {
      guildId: actor.guildId,
      hidden,
      fullServer: true,
      lockedChannelIds,
      channelPriorOverwrites,
      autoKickNewMembers,
      autoBanNewMembers,
      invitesPaused: pauseInvitesOpt,
      strippedRolePermissions,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "ALREADY_EXISTS") {
      await interaction.editReply("❌ Un lockdown est déjà actif — utilise `/lockdown fin` d'abord.");
      return;
    }
    throw e;
  }

  await interaction.editReply(
    `🔐 **Verrouillage total du serveur** — ${lockedChannelIds.length} salon(s), ${Object.keys(strippedRolePermissions).length} rôle(s) allégé(s)${pauseInvitesOpt ? ", invitations coupées" : ""}.`,
  );
}

async function executeFin(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const actor = await resolveActorContext(interaction);
  const guild = interaction.guild!;

  let state;
  try {
    state = await endLockdown(actor, actor.guildId);
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.editReply("ℹ️ Aucun lockdown actif.");
      return;
    }
    throw e;
  }

  for (const [channelId, snapshot] of Object.entries(state.channelPriorOverwrites)) {
    await unlockChannel(guild, channelId, snapshot);
  }
  if (Object.keys(state.strippedRolePermissions).length > 0) {
    await restoreRolePermissions(guild, state.strippedRolePermissions);
  }

  await interaction.editReply(
    `✅ Lockdown levé — ${state.lockedChannelIds.length} salon(s) et ${Object.keys(state.strippedRolePermissions).length} rôle(s) restaurés.${state.invitesPaused ? " (les anciennes invitations restent supprimées — recrée-les si besoin)" : ""}`,
  );
}

async function executeStatut(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const state = await getLockdownState(actor.guildId);
  if (!state.active) {
    await interaction.reply({ content: "✅ Aucun lockdown actif.", ephemeral: true });
    return;
  }
  await interaction.reply({
    content: `🔐 Lockdown actif depuis ${state.lockedAt} — ${state.lockedChannelIds.length} salon(s)${state.fullServer ? ", serveur entier" : ""}${state.hidden ? ", mode caché" : ""}.`,
    ephemeral: true,
  });
}
