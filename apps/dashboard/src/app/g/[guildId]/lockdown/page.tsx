import { prisma } from "@discord-rp/database";
import { LockdownState } from "@discord-rp/core";

export default async function LockdownPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guildConfig = await prisma.guildConfig.findUnique({ where: { guildId } });
  const parsed = LockdownState.safeParse(guildConfig?.lockdownState ?? {});
  const state = parsed.success ? parsed.data : LockdownState.parse({});

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Lockdown</h1>
      <p style={{ color: "#a79ec2" }}>
        Géré depuis Discord via <code>/lockdown</code>.
      </p>

      {!state.active ? (
        <p style={{ color: "#a79ec2", marginTop: 20 }}>✅ Aucun lockdown actif.</p>
      ) : (
        <div style={cardStyle}>
          <div>🔐 Lockdown actif depuis <strong>{state.lockedAt}</strong></div>
          <div>Salons verrouillés : <strong>{state.lockedChannelIds.length}</strong></div>
          <div>Mode serveur entier : <strong>{state.fullServer ? "oui" : "non"}</strong></div>
          <div>Mode caché : <strong>{state.hidden ? "oui" : "non"}</strong></div>
          <div>Kick nouveaux membres : <strong>{state.autoKickNewMembers ? "oui" : "non"}</strong></div>
          <div>Ban nouveaux membres : <strong>{state.autoBanNewMembers ? "oui" : "non"}</strong></div>
          <div>Invitations coupées : <strong>{state.invitesPaused ? "oui" : "non"}</strong></div>
          <div>Rôles allégés : <strong>{Object.keys(state.strippedRolePermissions).length}</strong></div>
        </div>
      )}
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
