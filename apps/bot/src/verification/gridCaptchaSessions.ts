/**
 * In-memory grid-captcha state — the challenge lives only as long as the
 * ephemeral message it's attached to (a couple minutes at most), so it
 * doesn't need a DB table. Keyed by "guildId:discordUserId", one attempt
 * in flight at a time per member. This is the button-grid alternative to
 * native image-rendered captchas (see M26 design notes): no canvas/image
 * library, no native bindings, same anti-bot friction.
 */
export interface GridCaptchaSession {
  correctIndex: number;
  attemptsRemaining: number;
}

const EMOJI_POOL = ["🟥", "🟦", "🟩", "🟨", "🟪", "🟧", "⬛", "⬜", "🟫"] as const;
const GRID_SIZE = 9;
const MAX_ATTEMPTS = 3;

const sessions = new Map<string, GridCaptchaSession>();

export function sessionKey(guildId: string, discordUserId: string): string {
  return `${guildId}:${discordUserId}`;
}

/** Every cell shows the same neutral emoji except one target cell, chosen at random — the challenge is "find the one that doesn't match". */
export function generateGrid(): { emojis: readonly string[]; targetEmoji: string; correctIndex: number } {
  const targetEmoji = EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)]!;
  const fillerEmoji = EMOJI_POOL.filter((e) => e !== targetEmoji)[0]!;
  const correctIndex = Math.floor(Math.random() * GRID_SIZE);
  const emojis = Array.from({ length: GRID_SIZE }, (_, i) => (i === correctIndex ? targetEmoji : fillerEmoji));
  return { emojis, targetEmoji, correctIndex };
}

export function startGridCaptcha(key: string, correctIndex: number): void {
  sessions.set(key, { correctIndex, attemptsRemaining: MAX_ATTEMPTS });
}

export function getGridCaptcha(key: string): GridCaptchaSession | undefined {
  return sessions.get(key);
}

/** Returns the remaining attempt count after this failure (0 = exhausted). */
export function consumeFailedAttempt(key: string): number {
  const session = sessions.get(key);
  if (!session) return 0;
  session.attemptsRemaining -= 1;
  if (session.attemptsRemaining <= 0) sessions.delete(key);
  return session.attemptsRemaining;
}

export function endGridCaptcha(key: string): void {
  sessions.delete(key);
}
