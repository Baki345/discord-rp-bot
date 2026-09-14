import { prisma } from "@discord-rp/database";
import { PanicConfig, PanicState } from "@discord-rp/core";

export default async function PanicPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guildConfig = await prisma.guildConfig.findUnique({ where: { guildId } });
  const config = PanicConfig.safeParse(guildConfig?.panicConfig ?? {});
  const state = PanicState.safeParse(guildConfig?.panicState ?? {});
  const cfg = config.success ? config.data : PanicConfig.parse({});
  const st = state.success ? state.data : PanicState.parse({});

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Mode panique</h1>
      <p style={{ color: "#a79ec2" }}>
        Géré depuis Discord via <code>/securite panic</code> — réservé au propriétaire et aux extra owners.
      </p>

      {st.active ? (
        <div style={{ ...cardStyle, borderColor: "#f87171" }}>
          🚨 <strong>Mode panique actif</strong> depuis {st.activatedAt}
          <div>Auteurs responsables : {st.respondingActorIds.join(", ") || "—"}</div>
        </div>
      ) : (
        <p style={{ color: "#a79ec2", marginTop: 20 }}>✅ Mode panique inactif.</p>
      )}

      <div style={cardStyle}>
        <div>Détection : <strong>{cfg.enabled ? "activée" : "désactivée"}</strong></div>
        <div>Seuil : <strong>{cfg.distinctActorsThreshold} auteurs distincts / {cfg.windowSeconds}s</strong></div>
        <div>Verrouillage auto : <strong>{cfg.autoLockdownOnActivate ? "oui" : "non"}</strong></div>
        <div>Restauration auto : <strong>{cfg.autoRestoreLatestBackup ? "oui" : "non"}</strong></div>
        <div>Déverrouillage auto à la fin : <strong>{cfg.autoUnlockOnEnd ? "oui" : "non"}</strong></div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 12,
  padding: "16px 20px",
  marginTop: 20,
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
  color: "#a79ec2",
  maxWidth: 420,
};
