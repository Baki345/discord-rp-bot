/**
 * Delegable administrative capabilities — distinct from Discord's own
 * server permissions. A Discord guild admin can always do everything
 * (see hasPermission below); these flags are what let a guild admin
 * delegate a SLICE of that to someone else (e.g. a "Support" RPRole with
 * only MANAGE_CHARACTERS, so they can fix a stuck player without also
 * being able to touch the economy or the job/item catalogs).
 */
export const PERMISSION_FLAGS = [
  "MANAGE_CHARACTERS",
  "MANAGE_ECONOMY",
  "MANAGE_COMPANIES",
  "MANAGE_JOBS",
  "MANAGE_VEHICLES",
  "MANAGE_ITEMS",
  "MANAGE_SHOPS",
  "VIEW_LOGS",
] as const;

export type PermissionFlag = (typeof PERMISSION_FLAGS)[number];

export function isPermissionFlag(value: string): value is PermissionFlag {
  return (PERMISSION_FLAGS as readonly string[]).includes(value);
}
