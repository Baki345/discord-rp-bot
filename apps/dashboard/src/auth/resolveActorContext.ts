import type { Session } from "next-auth";
import { prisma } from "@discord-rp/database";
import { getMemberPermissions, type ActorContext } from "@discord-rp/core";
import { fetchUserGuilds, hasGuildAdminPermission } from "./discord-api";

/** The Discord OAuth2 access token the Prisma adapter stored for this user, for the "discord" provider account. */
async function getDiscordAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "discord" },
    select: { access_token: true },
  });
  return account?.access_token ?? null;
}

/**
 * Builds the ActorContext every packages/core service expects, from a
 * dashboard session + the guild currently being administered. Mirrors
 * apps/bot's resolveActorContext exactly in shape — only how
 * isDiscordGuildAdmin gets computed differs (a live Discord OAuth call
 * here, the interaction's own memberPermissions on the bot side).
 */
export async function resolveActorContext(session: Session, guildId: string): Promise<ActorContext> {
  const discordUserId = session.user.discordId;
  let isDiscordGuildAdmin = false;

  const accessToken = await getDiscordAccessToken(session.user.id);
  if (accessToken) {
    try {
      const guilds = await fetchUserGuilds(accessToken);
      const match = guilds.find((g) => g.id === guildId);
      isDiscordGuildAdmin = match ? hasGuildAdminPermission(match.permissions) : false;
    } catch {
      // Discord API unreachable or token expired — fail closed (not an admin),
      // never throw here: a transient Discord outage shouldn't crash the page.
      isDiscordGuildAdmin = false;
    }
  }

  const rpPermissions = await getMemberPermissions(guildId, discordUserId);

  return {
    guildId,
    discordUserId,
    source: "dashboard",
    isDiscordGuildAdmin,
    rpPermissions,
  };
}
