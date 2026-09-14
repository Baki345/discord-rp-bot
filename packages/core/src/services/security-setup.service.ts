import { z } from "zod";
import { prisma, type Prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

export async function getStaticConfig(guildId: string) {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  const partnershipChannelIds = z.array(z.string()).safeParse(config?.partnershipChannelIds ?? []);
  return {
    mainChannelId: config?.mainChannelId ?? null,
    partnershipChannelIds: partnershipChannelIds.success ? partnershipChannelIds.data : [],
  };
}

export async function setMainChannel(actor: ActorContext, input: { guildId: string; channelId: string | null }) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  await prisma.guildConfig.update({ where: { guildId: input.guildId }, data: { mainChannelId: input.channelId } });
  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "security.set_main_channel",
    metadata: { channelId: input.channelId },
  });
}

export async function setPartnershipChannel(actor: ActorContext, input: { guildId: string; channelId: string; add: boolean }) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const current = await getStaticConfig(input.guildId);
  const next = input.add
    ? current.partnershipChannelIds.includes(input.channelId)
      ? current.partnershipChannelIds
      : [...current.partnershipChannelIds, input.channelId]
    : current.partnershipChannelIds.filter((id) => id !== input.channelId);

  await prisma.guildConfig.update({ where: { guildId: input.guildId }, data: { partnershipChannelIds: next as Prisma.InputJsonValue } });
  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "security.set_partnership_channels",
    metadata: { channelId: input.channelId, add: input.add },
  });
  return next;
}

export interface SecurityDiagnosticsInput {
  quarantineRoleId: string | null;
  generalLogRouteChannelId: string | null;
  verificationEnabled: boolean;
  verifiedRoleId: string | null;
  antiNukeEnabled: boolean;
  automodEnabled: boolean;
  botRolePosition: number | null;
  quarantineRolePosition: number | null;
}

export interface DiagnosticCheck {
  ok: boolean;
  label: string;
  detail?: string;
}

/**
 * Pure — no I/O. The caller assembles the live values (from various
 * get*Config calls plus, for the role-position check, live Discord role
 * data) since packages/core never touches discord.js directly.
 */
export function runSecurityDiagnostics(input: SecurityDiagnosticsInput): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = [];

  checks.push({
    ok: input.quarantineRoleId !== null,
    label: "Rôle de quarantaine configuré",
    detail: input.quarantineRoleId === null ? "Lance /securite quarantaine setup." : undefined,
  });

  if (input.quarantineRoleId !== null && input.botRolePosition !== null && input.quarantineRolePosition !== null) {
    checks.push({
      ok: input.botRolePosition > input.quarantineRolePosition,
      label: "Le rôle du bot est au-dessus du rôle de quarantaine",
      detail: input.botRolePosition <= input.quarantineRolePosition ? "Remonte le rôle du bot dans la hiérarchie des rôles." : undefined,
    });
  }

  checks.push({
    ok: input.generalLogRouteChannelId !== null,
    label: "Salon de logs généraux configuré",
    detail: input.generalLogRouteChannelId === null ? "Lance /config salon-securite avec la catégorie Généraux." : undefined,
  });

  checks.push({
    ok: !input.verificationEnabled || input.verifiedRoleId !== null,
    label: "Rôle de vérification configuré",
    detail: input.verificationEnabled && input.verifiedRoleId === null ? "Lance /securite verification setup." : undefined,
  });

  checks.push({ ok: input.antiNukeEnabled, label: "Anti-nuke activé", detail: input.antiNukeEnabled ? undefined : "Lance /securite anti-nuke setup." });
  checks.push({ ok: input.automodEnabled, label: "Auto-modération activée", detail: input.automodEnabled ? undefined : "Lance /securite automod setup." });

  return checks;
}
