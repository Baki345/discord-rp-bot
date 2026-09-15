import type { CSSProperties } from "react";
import { getLevelingConfig, listLeaderboard } from "@discord-rp/core";
import { updateLevelingConfigAction } from "./actions";

export default async function LevelingPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [config, leaderboard] = await Promise.all([getLevelingConfig(guildId), listLeaderboard(guildId, 10)]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Niveaux</h1>
      <p style={{ color: "#a79ec2" }}>
        XP gagnée en discutant (avec cooldown anti-spam) et en vocal. Commandes : <code>/niveau</code>,{" "}
        <code>/classement</code>.
      </p>

      <form action={updateLevelingConfigAction.bind(null, guildId)} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20, maxWidth: 420 }}>
        <label style={checkboxLabelStyle}>
          <input type="checkbox" name="enabled" defaultChecked={config.enabled} />
          Activer le système de niveaux
        </label>
        <label style={labelStyle}>
          XP par message (avant cooldown)
          <input type="number" name="xpPerMessage" min="1" defaultValue={config.xpPerMessage} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          XP par minute en vocal
          <input type="number" name="xpPerVoiceMinute" min="1" defaultValue={config.xpPerVoiceMinute} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Cooldown entre deux gains d&apos;XP texte (secondes)
          <input type="number" name="cooldownSeconds" min="0" defaultValue={config.cooldownSeconds} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Multiplicateur de courbe (1 = normal, plus haut = niveaux plus longs)
          <input type="number" name="curveMultiplier" min="0.1" step="0.1" defaultValue={config.curveMultiplier} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Rôles de récompense (JSON — laisser vide pour ne pas changer)
          <textarea name="rewardRolesJson" rows={3} placeholder={JSON.stringify(config.rewardRoles)} style={{ ...inputStyle, fontFamily: "monospace" }} />
        </label>
        <label style={labelStyle}>
          Fond de carte par défaut (URL d&apos;image, utilisé pour tout membre sans fond personnalisé via <code>/niveau carte-fond</code>)
          <input type="text" name="defaultCardBackgroundUrl" defaultValue={config.defaultCardBackgroundUrl ?? ""} style={inputStyle} />
        </label>

        <label style={checkboxLabelStyle}>
          <input type="checkbox" name="announceLevelUp" defaultChecked={config.announceLevelUp} />
          Annoncer les passages de niveau
        </label>
        <label style={labelStyle}>
          Salon d&apos;annonce (ID, vide = salon du message pour l&apos;XP texte ; requis pour annoncer les niveaux gagnés en vocal)
          <input type="text" name="announceChannelId" defaultValue={config.announceChannelId ?? ""} placeholder="ID de salon" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Message d&apos;annonce (<code>{"{membre}"}</code> et <code>{"{niveau}"}</code> sont remplacés)
          <input type="text" name="announceMessage" defaultValue={config.announceMessage} style={inputStyle} />
        </label>

        <button type="submit" style={buttonStyle}>
          Enregistrer
        </button>
      </form>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Classement</h2>
      <ol style={{ paddingLeft: 20 }}>
        {leaderboard.map((entry) => (
          <li key={entry.discordUserId} style={{ color: "#f4f2fa", fontSize: "0.9rem" }}>
            <code>{entry.discordUserId}</code> — niveau {entry.level} ({entry.xp} XP)
          </li>
        ))}
        {leaderboard.length === 0 && <li style={{ color: "#a79ec2" }}>Personne n&apos;a encore gagné d&apos;XP.</li>}
      </ol>
    </div>
  );
}

const labelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, color: "#f4f2fa", fontSize: "0.9rem" };
const checkboxLabelStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, color: "#f4f2fa", fontSize: "0.9rem" };
const inputStyle: CSSProperties = { background: "#171225", border: "1px solid #2a2340", borderRadius: 6, padding: "8px 10px", color: "#f4f2fa" };
const buttonStyle: CSSProperties = {
  background: "#7c3aed",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  color: "white",
  cursor: "pointer",
  alignSelf: "flex-start",
};
