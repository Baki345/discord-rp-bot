import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId: string;
    } & DefaultSession["user"];
  }

  interface User {
    discordId?: string;
    username?: string;
    discriminator?: string | null;
    globalName?: string | null;
    avatarUrl?: string | null;
  }
}
