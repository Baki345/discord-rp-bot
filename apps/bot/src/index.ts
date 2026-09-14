import "dotenv/config";
import { GatewayIntentBits } from "discord.js";
import { loadEnv } from "@discord-rp/config";
import { BotClient } from "./client.js";
import { configCommand } from "./commands/config/index.js";
import { personnageCommand } from "./commands/personnage/index.js";
import { personnageCreateModalHandler, personnageDeleteConfirmHandler } from "./commands/personnage/interactions.js";
import { economieCommand } from "./commands/economie/index.js";
import { banqueCommand } from "./commands/banque/index.js";
import { metierCommand } from "./commands/metier/index.js";
import { entrepriseCommand } from "./commands/entreprise/index.js";
import { vehiculeCommand } from "./commands/vehicule/index.js";
import { boutiqueCommand } from "./commands/boutique/index.js";
import { inventaireCommand } from "./commands/inventaire/index.js";
import { lieuCommand } from "./commands/lieu/index.js";
import { cleCommand } from "./commands/cle/index.js";
import { activiteCommand } from "./commands/activite/index.js";
import { craftCommand } from "./commands/craft/index.js";
import { permisCommand } from "./commands/permis/index.js";
import { permisAnswerHandler } from "./commands/permis/interactions.js";
import { sessionCommand } from "./commands/session/index.js";
import { serviceCommand } from "./commands/service/index.js";
import { braquageCommand } from "./commands/braquage/index.js";
import { drogueCommand } from "./commands/drogue/index.js";
import { racketCommand } from "./commands/racket/index.js";
import { blanchimentCommand } from "./commands/blanchiment/index.js";
import { bourseCommand } from "./commands/bourse/index.js";
import { modCommand } from "./commands/mod/index.js";
import { banContextMenu, kickContextMenu, timeoutContextMenu } from "./commands/mod/contextMenus.js";
import { securiteCommand } from "./commands/securite/index.js";
import { rescueCommand } from "./commands/rescue/index.js";
import { registerReadyEvent } from "./events/ready.js";
import { registerGuildCreateEvent } from "./events/guildCreate.js";
import { registerInteractionCreateEvent } from "./events/interactionCreate.js";
import { registerVoiceStateUpdateEvent } from "./events/voiceStateUpdate.js";
import { registerChannelCreateEvent } from "./events/channelCreate.js";
import { registerGuildMemberAddEvent } from "./events/guildMemberAdd.js";
import { registerGuildMemberUpdateJoinGateEvent } from "./events/guildMemberUpdateJoinGate.js";
import { registerJoinRaidDetectionEvent } from "./events/joinRaidDetection.js";
import { registerMessageCreateAutomodEvent } from "./events/messageCreateAutomod.js";
import { verifyStartHandler, verifyConfirmHandler, verifyGridHandler, verifyModalHandler } from "./verification/interactions.js";
import { startVerificationTimeoutTicker } from "./verification/verificationTimeoutTicker.js";
import { startWebVerificationTicker } from "./verification/webVerificationTicker.js";
import { startAuditLogMirror } from "./audit/mirrorAuditLogs.js";
import { startNeedsTicker } from "./needs/tickNeeds.js";
import { startAfkTicker } from "./voice/afkTicker.js";

const env = loadEnv();
if (!env.DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_BOT_TOKEN is required to start the bot.");
}

// GuildMembers and MessageContent are privileged intents — both must be
// toggled on in the Discord Developer Portal's Bot tab (free under 100
// servers). GuildMembers is for join-gate (M24) and join-raid detection
// (M25) to receive GuildMemberAdd reliably; MessageContent is for the
// heat auto-moderation system (M27) to read message text at all.
const client = new BotClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

for (const command of [
  configCommand,
  personnageCommand,
  economieCommand,
  banqueCommand,
  metierCommand,
  entrepriseCommand,
  vehiculeCommand,
  boutiqueCommand,
  inventaireCommand,
  lieuCommand,
  cleCommand,
  activiteCommand,
  craftCommand,
  permisCommand,
  sessionCommand,
  serviceCommand,
  braquageCommand,
  drogueCommand,
  racketCommand,
  blanchimentCommand,
  bourseCommand,
  modCommand,
  securiteCommand,
  rescueCommand,
]) {
  client.commands.set(command.data.name, command);
}
for (const command of [banContextMenu, kickContextMenu, timeoutContextMenu]) {
  client.contextMenuCommands.set(command.data.name, command);
}
client.modalHandlers.push(personnageCreateModalHandler, verifyModalHandler);
client.buttonHandlers.push(personnageDeleteConfirmHandler, permisAnswerHandler, verifyStartHandler, verifyConfirmHandler, verifyGridHandler);

registerReadyEvent(client);
registerGuildCreateEvent(client);
registerInteractionCreateEvent(client);
registerVoiceStateUpdateEvent(client);
registerChannelCreateEvent(client);
registerGuildMemberAddEvent(client);
registerGuildMemberUpdateJoinGateEvent(client);
registerJoinRaidDetectionEvent(client);
registerMessageCreateAutomodEvent(client);
startAuditLogMirror(client);
startNeedsTicker();
startAfkTicker(client);
startVerificationTimeoutTicker(client);
startWebVerificationTicker(client);

client.login(env.DISCORD_BOT_TOKEN);
