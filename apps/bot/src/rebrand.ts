import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REST, Routes } from "discord.js";
import { loadEnv } from "@discord-rp/config";

/**
 * One-off script: sets the bot's public name/avatar to match the project's
 * branding. Two separate Discord identities need updating — the
 * application (name/icon shown on the OAuth2 authorize screen and in the
 * Developer Portal) and the bot user itself (username/avatar shown in
 * server member lists and DMs) — so this makes both calls and reports each
 * independently rather than assuming one implies the other.
 */
const env = loadEnv();
if (!env.DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_BOT_TOKEN is required to rebrand the bot.");
}

const BOT_NAME = "ULTRA RPBOT";
const logoPath = join(import.meta.dirname, "..", "assets", "logo.png");
const logoDataUri = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;

const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);

async function main() {
  try {
    await rest.patch(Routes.currentApplication(), { body: { name: BOT_NAME, icon: logoDataUri } });
    console.log("✅ Nom et icône de l'application Discord mis à jour.");
  } catch (e) {
    console.error(
      "❌ Échec de la mise à jour de l'application (nom/icône). Si Discord refuse le champ « name » ici, renomme-la manuellement dans le Developer Portal (Application → General Information) et importe le logo depuis apps/bot/assets/logo.png :",
      e,
    );
  }

  try {
    // Discord limits username changes to twice per hour on the bot's own account.
    await rest.patch(Routes.user("@me"), { body: { username: BOT_NAME, avatar: logoDataUri } });
    console.log("✅ Nom d'utilisateur et avatar du bot mis à jour.");
  } catch (e) {
    console.error("❌ Échec de la mise à jour de l'utilisateur (nom/avatar) :", e);
  }
}

main();
