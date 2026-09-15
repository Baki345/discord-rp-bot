import type { ButtonInteraction } from "discord.js";
import { getMusicConfig } from "@discord-rp/core";
import type { ButtonHandler } from "../client.js";
import { actorCanControlMusic } from "./musicPermissions.js";
import * as playback from "./playback.js";

async function assertCanControl(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.inGuild()) return false;
  const config = await getMusicConfig(interaction.guildId);
  if (!actorCanControlMusic(interaction, config)) {
    await interaction.reply({ content: "❌ Il te faut le rôle DJ (ou administrateur) pour contrôler la musique.", ephemeral: true });
    return false;
  }
  return true;
}

export const musiquePauseHandler: ButtonHandler = {
  customIdPrefix: "musique:pause",
  async execute(interaction) {
    if (!(await assertCanControl(interaction))) return;
    const paused = await playback.togglePause(interaction.guildId!);
    if (paused === null) {
      await interaction.reply({ content: "❌ Rien n'est en cours de lecture.", ephemeral: true });
      return;
    }
    await interaction.reply({ content: paused ? "⏸️ Musique en pause." : "▶️ Lecture reprise.", ephemeral: true });
  },
};

export const musiqueSkipHandler: ButtonHandler = {
  customIdPrefix: "musique:skip",
  async execute(interaction) {
    if (!(await assertCanControl(interaction))) return;
    const ok = await playback.skip(interaction.guildId!);
    await interaction.reply({ content: ok ? "⏭️ Piste passée." : "❌ Rien n'est en cours de lecture.", ephemeral: true });
  },
};

export const musiqueStopHandler: ButtonHandler = {
  customIdPrefix: "musique:stop",
  async execute(interaction) {
    if (!(await assertCanControl(interaction))) return;
    const ok = await playback.stop(interaction.guildId!);
    await interaction.reply({ content: ok ? "⏹️ Musique arrêtée." : "❌ Rien n'est en cours de lecture.", ephemeral: true });
  },
};

export const musiqueLoopHandler: ButtonHandler = {
  customIdPrefix: "musique:loop",
  async execute(interaction) {
    if (!(await assertCanControl(interaction))) return;
    const mode = playback.cycleLoop(interaction.guildId!);
    if (mode === null) {
      await interaction.reply({ content: "❌ Rien n'est en cours de lecture.", ephemeral: true });
      return;
    }
    const label = mode === "off" ? "désactivée" : mode === "track" ? "piste" : "file";
    await interaction.reply({ content: `🔁 Boucle : ${label}.`, ephemeral: true });
  },
};
