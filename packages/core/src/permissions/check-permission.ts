import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import type { PermissionFlag } from "./permission-flags.js";

/** A Discord guild admin can always act — RPRole flags are how someone WITHOUT that Discord permission gets a specific capability instead. */
export function hasPermission(actor: ActorContext, flag: PermissionFlag): boolean {
  return actor.isDiscordGuildAdmin || actor.rpPermissions.includes(flag);
}

export function requirePermission(actor: ActorContext, flag: PermissionFlag): void {
  if (!hasPermission(actor, flag)) throw new ServiceError("FORBIDDEN", { flag });
}
