import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DISCORD_BOT_TOKEN: z.string().min(1).optional(),
  DISCORD_CLIENT_ID: z.string().min(1).optional(),
  DISCORD_CLIENT_SECRET: z.string().min(1).optional(),
  DISCORD_REDIRECT_URI: z.string().min(1).optional(),
  DISCORD_DEV_GUILD_ID: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().min(1).optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  SUPER_ADMIN_DISCORD_IDS: z.string().default(""),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Parses and validates process.env once per process. Each app (bot,
 * dashboard) calls this at startup so a missing/misnamed variable fails
 * loudly at boot instead of surfacing as a confusing runtime error deep in
 * a service call.
 */
export function loadEnv(): Env {
  if (cached) return cached;
  // An unset optional var left blank in a .env file (`FOO=`) arrives here as
  // "" rather than absent — treat it the same as absent so optional fields
  // don't fail validation just because they weren't filled in.
  const sanitized = Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => [key, value === "" ? undefined : value]),
  );
  const parsed = envSchema.safeParse(sanitized);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function getSuperAdminDiscordIds(env: Env): string[] {
  return env.SUPER_ADMIN_DISCORD_IDS.split(",").map((s) => s.trim()).filter(Boolean);
}
