import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@discord-rp/database";

/** Raw shape of Discord's OAuth2 /users/@me profile response. */
interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  email: string | null;
  avatar: string | null;
}

function discordAvatarUrl(profile: DiscordProfile): string | null {
  return profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  // Self-hosted behind Caddy on a VPS, not Vercel — Auth.js only trusts the
  // request Host header automatically on Vercel, so this is required in
  // every other deployment (dev included) or every auth route 500s.
  trustHost: true,
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      // The built-in Discord provider's `authorization` default is a full
      // URL string ("...authorize?scope=identify+email"); overriding it with
      // an object that omits `url` doesn't merge with that default, it
      // replaces it — leaving no authorization URL at all and making
      // Auth.js attempt (and fail) OIDC auto-discovery instead. Repeat the
      // URL explicitly. Default scope is "identify email" — "guilds" is
      // what lets the guild picker ask Discord which servers this user can
      // administer.
      authorization: {
        url: "https://discord.com/api/oauth2/authorize",
        params: { scope: "identify guilds" },
      },
      profile(profile: DiscordProfile) {
        return {
          id: profile.id,
          discordId: profile.id,
          username: profile.username,
          discriminator: profile.discriminator,
          globalName: profile.global_name,
          avatarUrl: discordAvatarUrl(profile),
          email: profile.email,
          name: profile.global_name ?? profile.username,
          image: discordAvatarUrl(profile),
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.discordId = user.discordId ?? "";
      return session;
    },
  },
});
