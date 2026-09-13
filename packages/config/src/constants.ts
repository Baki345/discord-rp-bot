/** Plan IDs are stable strings (not cuids) so they can be referenced literally in code and seed data. */
export const PLAN_IDS = {
  FREE: "FREE",
  PREMIUM: "PREMIUM",
  PREMIUM_PLUS: "PREMIUM_PLUS",
} as const;
export type PlanId = (typeof PLAN_IDS)[keyof typeof PLAN_IDS];

export const QUOTA_RESOURCES = [
  "characters",
  "vehicles",
  "companies",
  "jobs",
  "shops",
  "places",
] as const;
export type QuotaResource = (typeof QUOTA_RESOURCES)[number];

export const DEFAULT_STARTING_CASH_CENTS = 50_000;

/** Discord permission bits used to decide dashboard guild-picker eligibility (see resolveActorContext). */
export const DISCORD_PERMISSION_BITS = {
  ADMINISTRATOR: 0x8,
  MANAGE_GUILD: 0x20,
} as const;
