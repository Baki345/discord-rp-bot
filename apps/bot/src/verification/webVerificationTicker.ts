import { listUnprocessedWebVerificationAttempts, markVerificationAttemptProcessed, getVerificationConfig } from "@discord-rp/core";
import type { BotClient } from "../client.js";
import { grantVerifiedRole } from "./actions.js";

const TICK_INTERVAL_MS = 10_000;

/**
 * Web mode's other half: /verify/[guildId] (dashboard) confirms the
 * visitor's identity via its existing Discord OAuth and writes a
 * VerificationAttempt row — only this bot process holds a live Discord
 * connection, so it's the one that actually grants the role, polling for
 * what the dashboard wrote (same cross-process pattern as M9's audit-log
 * mirror and M10's needs ticker).
 */
export function startWebVerificationTicker(client: BotClient) {
  const tick = async () => {
    try {
      await processPending(client);
    } catch (err) {
      console.error("[web-verification] tick failed:", err);
    }
  };
  void tick();
  setInterval(tick, TICK_INTERVAL_MS);
}

async function processPending(client: BotClient) {
  const pending = await listUnprocessedWebVerificationAttempts();
  for (const attempt of pending) {
    try {
      const config = await getVerificationConfig(attempt.guildId);
      if (config.verifiedRoleId) {
        const guild = await client.guilds.fetch(attempt.guildId).catch(() => null);
        const member = await guild?.members.fetch(attempt.discordUserId).catch(() => null);
        if (member) await grantVerifiedRole(member, config.verifiedRoleId);
      }
    } catch (err) {
      console.error(`[web-verification] failed to process attempt ${attempt.id}:`, err);
    }
    await markVerificationAttemptProcessed(attempt.id);
  }
}
