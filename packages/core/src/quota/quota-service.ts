import { prisma } from "@discord-rp/database";
import type { QuotaResource } from "@discord-rp/config";
import { ServiceError } from "../errors/service-error.js";

function resolveLimit(
  resource: QuotaResource,
  plan: { maxCharactersPerGuild: number; maxVehiclesPerGuild: number; maxCompaniesPerGuild: number; maxJobsPerGuild: number; maxShopsPerGuild: number; maxPlacesPerGuild: number },
  config: { maxCharactersOverride: number | null } | null,
): number {
  switch (resource) {
    case "characters":
      // A guild-specific override is clamped to the plan's max — a guild can never
      // configure its way past what it's actually paying for.
      return config?.maxCharactersOverride != null
        ? Math.min(config.maxCharactersOverride, plan.maxCharactersPerGuild)
        : plan.maxCharactersPerGuild;
    case "vehicles":
      return plan.maxVehiclesPerGuild;
    case "companies":
      return plan.maxCompaniesPerGuild;
    case "jobs":
      return plan.maxJobsPerGuild;
    case "shops":
      return plan.maxShopsPerGuild;
    case "places":
      return plan.maxPlacesPerGuild;
  }
}

async function countCurrent(resource: QuotaResource, guildId: string): Promise<number> {
  switch (resource) {
    case "characters":
      return prisma.character.count({ where: { guildId, deletedAt: null } });
    case "vehicles":
      return prisma.vehicle.count({ where: { guildId } });
    case "companies":
      return prisma.company.count({ where: { guildId } });
    case "jobs":
      return prisma.job.count({ where: { guildId } });
    case "shops":
      return prisma.shop.count({ where: { guildId } });
    case "places":
      return prisma.place.count({ where: { guildId } });
  }
}

/** Throws ServiceError("QUOTA_EXCEEDED") when the guild is already at its plan limit for `resource`. */
export async function assertWithinQuota(guildId: string, resource: QuotaResource): Promise<void> {
  const guild = await prisma.guild.findUniqueOrThrow({
    where: { id: guildId },
    include: { plan: true, config: true },
  });
  const limit = resolveLimit(resource, guild.plan, guild.config);
  const current = await countCurrent(resource, guildId);
  if (current >= limit) {
    throw new ServiceError(
      "QUOTA_EXCEEDED",
      { resource, limit, current },
      `Limite atteinte pour "${resource}" (${current}/${limit}) — plan ${guild.plan.name}.`,
    );
  }
}

export async function isFeatureEnabled(guildId: string, feature: string): Promise<boolean> {
  const guild = await prisma.guild.findUniqueOrThrow({ where: { id: guildId }, include: { plan: true } });
  const flags = guild.plan.featureFlags as Record<string, boolean>;
  return Boolean(flags[feature]);
}
