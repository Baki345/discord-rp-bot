import { Events, type VoiceState } from "discord.js";
import type { BotClient } from "../client.js";
import { recordVoiceActivity, clearVoiceActivity } from "../voice/voiceActivity.js";

/** Any voice state change (join, move, mute/deafen toggle) counts as activity — leaving voice entirely clears tracking. */
export function registerVoiceStateUpdateEvent(client: BotClient) {
  client.on(Events.VoiceStateUpdate, (oldState: VoiceState, newState: VoiceState) => {
    if (!newState.guild || !newState.member) return;
    if (newState.channelId) {
      recordVoiceActivity(newState.guild.id, newState.member.id);
    } else {
      clearVoiceActivity(newState.guild.id, newState.member.id);
    }
  });
}
